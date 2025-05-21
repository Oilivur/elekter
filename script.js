let allValidDays = [];
let currentMatrix = [];
let currentDayLabels = [];

function showSection(id) {
  document.querySelectorAll('section').forEach(section => {
    section.classList.add('hidden');
    section.classList.remove('visible');
  });
  document.getElementById(id).classList.remove('hidden');
  document.getElementById(id).classList.add('visible');
}

function drawContours(matrix, containerId, dayLabels) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const width = 24;   // hours
  const height = matrix.length;  // days

  // Flatten into 1D array, row-major (top-to-bottom)
  const values = matrix.flat();
  const sorted = values.slice().sort((a, b) => a - b);
  const low = sorted[Math.floor(values.length * 0.01)];
  const high = sorted[Math.floor(values.length * 0.99)];

  
  const chart = Plot.plot({
    width: 900,
    height: 900,
    marginLeft: 80,
    x: {
      label: "Tund",
      tickFormat: d => d,
      ticks: d3.range(0, 24, 1)
    },
    y: {
      label: null,
      ticks: [0, 99],
      tickFormat: d => d === 0 ? dayLabels[0] : (d === 99 ? dayLabels[1] : "")
    },
    color: {
      scheme: "turbo",
      domain: [low, high],
      clamp: true,
      legend: true,
      label: "Tarbimine (kWh)"
    },
    marks: [
      Plot.contour(values, {
        width: 24,
        height: matrix.length,
        fill: Plot.identity,
        stroke: "black"
      })
    ]
  });


  container.appendChild(chart);
}


function drawOverlayChart(datasets, containerId, dateLabel) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  // Flatten into hour-based points
  const hourlyPoints = [];
  datasets.forEach(data => {
    data.forEach((value, hour) => {
      hourlyPoints.push({ hour, value });
    });
  });

  const plot = Plot.plot({
    width: 1200,
    height: 600,
    x: {
      label: "Tund",
      ticks: 24
    },
    y: {
      label: "Tarbimine (kWh)"
    },
    color: {
      legend: false
    },
    marks: [
      Plot.boxY(hourlyPoints, {
        x: "hour",
        y: "value",
        fill: "purple",
        stroke: "darkgreen",
        opacity: 0.7
      })
    ]
  });

  container.appendChild(plot);
  document.getElementById("dayTitle").textContent = `Kuupäev: ${dateLabel}`;
}




async function fetchDatasetList() {
  try {
    const res = await fetch('./datasets.json');
    const datasets = await res.json();

    const select = document.getElementById('datasetSelect');
    const singleSelect = document.getElementById('singleDatasetSelect');

    datasets.forEach((entry, i) => {
      const label = `${i + 1}. ${entry.dataset} | ${entry.heat_source} | ${entry.heated_area} m²`;

      if (select) {
        const opt1 = document.createElement('option');
        opt1.value = entry.dataset;
        opt1.text = label;
        select.appendChild(opt1);
      }

      if (singleSelect) {
        const opt2 = document.createElement('option');
        opt2.value = entry.dataset;
        opt2.text = label;
        singleSelect.appendChild(opt2);
      }
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

    allValidDays = validDays; // ✅ Store globally
    document.getElementById('daySlider').max = validDays.length - 100;
    document.getElementById('daySlider').value = Math.floor((validDays.length - 100) / 2);
    updateChartFromSlider(); // 🔁 Initial render


    if (validDays.length < 100) {
      chart1.innerHTML = `<p>⚠️ Leiti ainult ${validDays.length} sobivat päeva. Vaja vähemalt 100 päeva visualiseerimiseks.</p>`;
      return;
    }

    const startIdx = Math.floor((validDays.length - 100) / 2);
    const selectedDays = validDays.slice(startIdx, startIdx + 100);
    const matrix = selectedDays.map(([_, values]) => values);
    const dayLabels = [
      selectedDays[0][0],                      // Start date (YYYY-MM-DD)
      selectedDays[selectedDays.length - 1][0] // End date
    ];

    drawContours(matrix, 'chart1', dayLabels);


  } catch (err) {
    console.error('❌ Viga andmestiku laadimisel:', err);
    chart1.innerHTML = "<p>❌ Andmestiku laadimine ebaõnnestus.</p>";
  }
}

function updateChartFromSlider() {
  const startIdx = parseInt(document.getElementById('daySlider').value);
  const selectedDays = allValidDays.slice(startIdx, startIdx + 100);

  if (selectedDays.length < 100) return;

  currentMatrix = selectedDays.map(([_, values]) => values);
  currentDayLabels = [
    selectedDays[0][0],
    selectedDays[selectedDays.length - 1][0]
  ];

  document.getElementById('sliderLabel').textContent = `${currentDayLabels[0]} → ${currentDayLabels[1]}`;

  drawContours(currentMatrix, 'chart1', currentDayLabels);
}


async function loadAllDatasetLines() {
  const targetDate = document.getElementById('dateInput').value;
  const chart2 = document.getElementById('chart2');
  chart2.innerHTML = '';

  const res = await fetch('./datasets.json');
  const datasets = await res.json();

  const lines = [];

  for (const entry of datasets) {
    const url = `./datasets/${entry.dataset}.csv`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      const rows = text.split('\n').slice(5);

      const values = rows
        .filter(line => line.startsWith(formatEstonianDate(targetDate)))
        .map(line => {
          const [time, value] = line.split(';');
          return parseFloat(value.replace(',', '.'));
        });

      if (values.length === 24) {
        lines.push(values);
      }
    } catch (err) {
      console.warn(`❌ Viga faili laadimisel: ${entry.dataset}`, err);
    }
  }

  if (lines.length === 0) {
    chart2.innerHTML = "<p>⚠️ Valitud kuupäeval pole ühtegi täielikku andmestikku.</p>";
    return;
  }

  drawOverlayChart(lines, 'chart2', targetDate);

}


function formatEstonianDate(isoDate) {
  const [yyyy, mm, dd] = isoDate.split('-');
  return `${dd}.${mm}.${yyyy}`;
}

window.addEventListener('DOMContentLoaded', fetchDatasetList);
document.getElementById('daySlider').addEventListener('input', updateChartFromSlider);