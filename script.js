document.getElementById('fileInput').addEventListener('change', function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const lines = e.target.result.split('\n').slice(5); // Skip first 5 lines
    const data = lines
      .filter(line => line.trim().length > 0)
      .map(line => {
        const [time, value] = line.split(';');
        return {
          time: new Date(time.split(' ')[0].split('.').reverse().join('-') + 'T' + time.split(' ')[1] + ':00'),
          value: parseFloat(value.replace(',', '.')),
        };
      });

    drawChart(data);
  };
  reader.readAsText(file);
});

function drawChart(data) {
  const container = document.getElementById('chart');
  container.innerHTML = ''; // Clear previous chart

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
