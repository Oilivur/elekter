function showSection(id) {
  document.querySelectorAll('section').forEach(section => {
    section.classList.add('hidden');
    section.classList.remove('visible');
  });
  document.getElementById(id).classList.remove('hidden');
  document.getElementById(id).classList.add('visible');
}

function drawChart(data, chartId) {
  const container = document.getElementById(chartId);
  container.innerHTML = '';

  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  canvas.width = 1000;
  canvas.height = 400;

  const maxVal = Math.max(...data.map(d => d.value));
  const minVal = Math.min(...data.map(d => d.value));
  const stepX = canvas.width / data.length;

  ctx.beginPath();
  ctx.moveTo(0, canvas.height - (data[0].value - minVal) / (maxVal - minVal) * canvas.height);
  data.forEach((d, i) => {
    const x = i * stepX;
    const y = canvas.height - (d.value - minVal) / (maxVal - minVal) * canvas.height;
    ctx.lineTo(x, y);
  });
  ctx.strokeStyle = 'blue';
  ctx.stroke();
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
  const minVal = 0;
  const stepX = canvas.width / 24;

  const colors = ['red', 'blue', 'green', 'purple', 'orange', 'teal', 'magenta'];

  datasets.forEach((data, idx) => {
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - (data[0] - minVal) / (maxVal - minVal) * canvas.height);
    for (let i = 1; i < 24; i++) {
      const x = i * stepX;
      const y = canvas.height - (data[i] - minVal) / (maxVal - minVal) * canvas.height;
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
      const option1 = document.createElement('option');
      option1.value = entry.dataset;
      option1.text = `${i + 1}. ${entry.dataset} | ${entry.heat_source} | ${entry.heated_area} m²`;
      select.appendChild(option1);

      const option2 = document.createElement('option');
      option2.value = entry.dataset;
      option2.text = option1.text;
      singleSelect.appendChild(option2);
    });
  } catch (err) {
    console.error('Viga datasets.json laadimisel:', err);
  }
}

async function loadSingleDataset() {
  const hash = document.getElementById('singleDatasetSelect').value;
  console.log("Loading dataset:", hash);

  const chart1 = document.getElementById('chart1');
  chart1.innerHTML = '';

  const url = `./datasets/${hash}.csv`;
  try {
    const res = await fetch(url);
    const text = await res.text();

    const lines = text.split('\n').slice(5);
    if (lines.length < 24) {
      console.warn("⚠️ Not enough data rows:", lines.length);
      chart1.innerHTML = "<p>⚠️ Andmestikus pole piisavalt andmeid visualiseerimiseks.</p>";
      return;
    }

    const data = lines
      .filter(line => line.trim().length > 0)
      .map(line => {
        const [time, value] = line.split(';');
        return {
          time: new Date(time.split(' ')[0].split('.').reverse().join('-') + 'T' + time.split(' ')[1] + ':00'),
          value: parseFloat(value.replace(',', '.')),
        };
      });

    drawChart(data, 'chart1');
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
      console.error(`Viga faili laadimisel: ${hash}`, err);
    }
  }

  drawOverlayChart(datasets, 'chart2');
}

function formatEstonianDate(isoDate) {
  const [yyyy, mm, dd] = isoDate.split('-');
  return `${dd}.${mm}.${yyyy}`;
}

window.addEventListener('DOMContentLoaded', fetchDatasetList);
