function showSection(id) {
  document.querySelectorAll('section').forEach(section => {
    section.classList.add('hidden');
    section.classList.remove('visible');
  });
  document.getElementById(id).classList.remove('hidden');
  document.getElementById(id).classList.add('visible');
}

function drawContours(matrix, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const width = 24;   // hours
  const height = matrix.length;  // days

  // Flatten into 1D array, row-major (top-to-bottom)
  const values = matrix.flat();

  // Create the Plot chart
  const chart = Plot.plot({
    width: 600,
    height: 600,
    color: {
      legend: true,
      label: "Tarbimine (kWh)",
      scheme: "turbo"
    },
    marks: [
      Plot.contour(values, {
        width,
        height,
        fill: Plot.identity,
        stroke: "black"
      })
    ]
  });

  container.appendChild(chart);
}


function drawOverlayChart(datasets, chartId) {
  const container = document.getElementById(chartId);
  container.innerHTML = '';

  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  canvas.width = 1000;
  canvas.height = 400;

  const maxVal = Math.max(...datasets.flat());
  const stepX = canvas.width / 24;
  const colors = ['red', 'blue', 'green', 'purple', 'orange', 'teal', 'magenta'];

  datasets.forEach((data, idx) => {
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - (data[0] / maxVal) * canvas.height);
    for (let i = 1; i < 24; i++) {
      const x = i * stepX;
      const y = canvas.height - (data[i] / maxVal) * canvas.height;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = colors[idx % colors.length];
    ctx.stroke();
  });
}

async function fetchDatasetList() {
  try {
    const res = await fetch('./datasets.json');
    const datasets = await res.json();

    const select = document.getElementById('datasetSelect');
    const singleSelect = document.getElementById('singleDatasetSelect');

    datasets.forEach((entry, i) => {
      const label = `${i + 1}. ${entry.dataset} | ${entry.heat_source} | ${entry.heated_area} m²`;

      const opt1 = document.createElement('option');
      opt1.value = entry.dataset;
      opt1.text = label;
      select.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = entry.dataset;
      opt2.text = label;
      singleSelect.appendChild(opt2);
    });
  } catch (err) {
    console.error('❌ Viga datasets.json laadimisel:', err);
  }
}

async function loadSingleDataset() {
  const hash = document.getElementById('singleDatasetSelect').value;
  const chart1 = document.getElementById('chart1');
  chart1.innerHTML = '';
  console.log("📂 Loading dataset:", hash);

  try {
    const res = await fetch(`./datasets/${hash}.csv`);
    const text = await res.text();
    const lines = text.split('\n').slice(5);

    let data = lines
      .filter(line => line.trim() && line.includes(';'))
      .map(line => {
        const [time, value] = line.split(';');
        return {
          time: new Date(time.split(' ')[0].split('.').reverse().join('-') + 'T' + time.split(' ')[1] + ':00'),
          value: parseFloat(value.replace(',', '.')),
        };
      })
      .filter(d => !isNaN(d.value));

    data.sort((a, b) => a.time - b.time);

    const days = {};
    data.forEach(d => {
      const key = d.time.toISOString().split('T')[0];
      if (!days[key]) days[key] = [];
      days[key].push(d.value);
    });

    const validDays = Object.entries(days).filter(([_, values]) => values.length === 24);
    console.log("📊 Valid 24-hour days:", validDays.length);

    if (validDays.length < 100) {
      chart1.innerHTML = `<p>⚠️ Leiti ainult ${validDays.length} sobivat päeva. Vaja vähemalt 100 päeva visualiseerimiseks.</p>`;
      return;
    }

    const startIdx = Math.floor((validDays.length - 100) / 2);
    const selectedDays = validDays.slice(startIdx, startIdx + 100);
    const matrix = selectedDays.map(([_, values]) => values);

    drawContours(matrix, 'chart1');

  } catch (err) {
    console.error('❌ Viga andmestiku laadimisel:', err);
    chart1.innerHTML = "<p>❌ Andmestiku laadimine ebaõnnestus.</p>";
  }
}

async function loadSelectedDatasets() {
  const selected = Array.from(document.getElementById('datasetSelect').selectedOptions).map(opt => opt.value);
  const targetDate = document.getElementById('dateInput').value;
  const chart2 = document.getElementById('chart2');
  chart2.innerHTML = '';

  const datasets = [];

  for (const hash of selected) {
    const url = `./datasets/${hash}.csv`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      const lines = text.split('\n').slice(5);

      const oneDayData = lines
        .filter(line => line.startsWith(formatEstonianDate(targetDate)))
        .map(line => {
          const [time, value] = line.split(';');
          return parseFloat(value.replace(',', '.'));
        });

      if (oneDayData.length === 24) {
        datasets.push(oneDayData);
      }
    } catch (err) {
      console.error(`❌ Viga faili laadimisel: ${hash}`, err);
    }
  }

  if (datasets.length === 0) {
    chart2.innerHTML = "<p>⚠️ Ühtegi sobivat andmestikku ei leitud valitud kuupäeval.</p>";
  } else {
    drawOverlayChart(datasets, 'chart2');
  }
}

function formatEstonianDate(isoDate) {
  const [yyyy, mm, dd] = isoDate.split('-');
  return `${dd}.${mm}.${yyyy}`;
}

window.addEventListener('DOMContentLoaded', fetchDatasetList);
