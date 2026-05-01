import puppeteer from 'puppeteer';

const buildCompliantBirthSexChartModel = ({
  compliantMaleCount,
  compliantFemaleCount,
  compliantIntersexCount,
  compliantOtherBirthSexCount,
}) => {
  const maleCount = Number(compliantMaleCount || 0);
  const femaleCount = Number(compliantFemaleCount || 0);
  const intersexCount = Number(compliantIntersexCount || 0);
  const otherCount = Number(compliantOtherBirthSexCount || 0);
  const totalCompliant = maleCount + femaleCount + intersexCount + otherCount;

  const malePercent = totalCompliant > 0 ? Number(((maleCount / totalCompliant) * 100).toFixed(1)) : 0;
  const femalePercent = totalCompliant > 0 ? Number(((femaleCount / totalCompliant) * 100).toFixed(1)) : 0;
  const otherPercent = totalCompliant > 0
    ? Number((((intersexCount + otherCount) / totalCompliant) * 100).toFixed(1))
    : 0;

  return {
    maleCount,
    femaleCount,
    intersexCount,
    otherCount,
    totalCompliant,
    malePercent,
    femalePercent,
    otherPercent,
  };
};

const buildDepartmentComplianceChartUrl = (departmentCompliance = []) => {
  const labels = departmentCompliance.map((item) => item.department);
  const values = departmentCompliance.map((item) => Number(item.complianceRatePercent || 0));
  const chartConfig = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Compliance Rate (%)',
          data: values,
          backgroundColor: '#2563eb',
          borderRadius: 6,
        },
      ],
    },
    options: {
      indexAxis: 'x',
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { callback: 'function(value){ return value + "%" }' },
          title: { display: true, text: 'Rate (%)' },
        },
      },
      plugins: {
        legend: { display: false },
      },
    },
  };

  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
};

const buildProgressChartUrl = ({ totalEmployees, totalCompliant, totalNonCompliant, complianceRatePercent }) => {
  const chartConfig = {
    type: 'bar',
    data: {
      labels: ['Total Employees', 'Total Compliant', 'Total Non-Compliant'],
      datasets: [
        {
          label: 'Employees',
          data: [Number(totalEmployees || 0), Number(totalCompliant || 0), Number(totalNonCompliant || 0)],
          backgroundColor: ['#1f3c77', '#16a34a', '#dc2626'],
          yAxisID: 'y',
        },
        {
          type: 'line',
          label: 'Compliance Rate (%)',
          data: [Number(complianceRatePercent || 0), Number(complianceRatePercent || 0), Number(complianceRatePercent || 0)],
          borderColor: '#f59e0b',
          backgroundColor: '#f59e0b',
          yAxisID: 'y1',
          tension: 0.2,
          pointRadius: 4,
          fill: false,
        },
      ],
    },
    options: {
      plugins: { legend: { position: 'bottom' } },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Employee Count' },
        },
        y1: {
          beginAtZero: true,
          max: 100,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { callback: 'function(value){ return value + "%" }' },
          title: { display: true, text: 'Compliance Rate (%)' },
        },
      },
    },
  };
  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
};

const escapeHtml = (value) => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export const generateCHEDReport = async (data) => {
  const compliantBirthSex = buildCompliantBirthSexChartModel({
    compliantMaleCount: data?.compliantMaleCount,
    compliantFemaleCount: data?.compliantFemaleCount,
    compliantIntersexCount: data?.compliantIntersexCount,
    compliantOtherBirthSexCount: data?.compliantOtherBirthSexCount,
  });
  const departmentChartUrl = buildDepartmentComplianceChartUrl(data?.departmentCompliance || []);
  const progressChartUrl = buildProgressChartUrl({
    totalEmployees: data?.totalEmployees,
    totalCompliant: data?.totalCompliant,
    totalNonCompliant: data?.totalNonCompliant,
    complianceRatePercent: data?.complianceRatePercent,
  });

  const employeesRows = Array.isArray(data?.employees)
    ? data.employees
        .map(
          (emp) => `
            <tr>
              <td>${escapeHtml(emp?.name)}</td>
              <td>${escapeHtml(emp?.department)}</td>
              <td>${escapeHtml(emp?.position)}</td>
              <td>${escapeHtml(emp?.birthSex)}</td>
              <td>${escapeHtml(emp?.genderIdentity || 'N/A')}</td>
              <td>${escapeHtml(emp?.seminarCount ?? 0)}</td>
            </tr>
          `
        )
        .join('')
    : '';

  const institutionName = escapeHtml(process.env.REPORT_INSTITUTION_NAME || 'Xavier University');
  const generatedDate = new Date();
  const generatedDateDisplay = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(generatedDate);
  const totalEmployees = Number(data?.totalEmployees || (Array.isArray(data?.employees) ? data.employees.length : 0));
  const totalCompliant = Number(data?.totalCompliant || 0);
  const totalNonCompliant = Number(data?.totalNonCompliant || 0);
  const complianceRatePercent = Number(data?.complianceRatePercent || 0);
  const summaryText = totalEmployees
    ? `This report provides an overview of employee compliance with mandated Gender and Development (GAD) seminar participation. Based on current records, ${totalEmployees} employees are actively monitored, of which only ${totalCompliant} have achieved compliance while ${totalNonCompliant} remain non-compliant. This corresponds to an overall compliance rate of ${complianceRatePercent.toFixed(1)}%.`
    : 'This report provides an overview of employee compliance with mandated Gender and Development (GAD) seminar participation. Based on current records, 0 employees are actively monitored, of which only 0 have achieved compliance while 0 remain non-compliant. This corresponds to an overall compliance rate of 0.0%.';
  const topDepartment = Array.isArray(data?.departmentCompliance) && data.departmentCompliance.length
    ? data.departmentCompliance[0]
    : null;
  const analysisText = topDepartment
    ? `The highest compliance is currently observed in ${escapeHtml(topDepartment.department)} at ${Number(topDepartment.complianceRatePercent || 0).toFixed(1)}%. Use the department chart to identify units with lower compliance and prioritize follow-up interventions.`
    : 'Department-level compliance analysis is unavailable because no department records were found.';

  const htmlContent = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; margin: 34px; color: #1b1b1b; font-size: 12px; }
          .header { text-align: center; margin-bottom: 16px; }
          .header h2 { margin: 0; color: #003366; font-size: 22px; }
          .header h3 { margin: 4px 0; font-weight: 600; font-size: 15px; }
          .header p { margin: 2px 0; font-size: 13px; }
          .generated-date { margin-top: 4px; color: #4b5563; font-size: 11px; }
          .section-title { margin: 16px 0 8px; color: #0f172a; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; }
          .summary-text, .analysis-text { margin: 0 0 10px; line-height: 1.45; font-size: 12px; }
          .charts-row { display: flex; gap: 12px; justify-content: space-between; margin-bottom: 12px; }
          .chart-box { width: 49%; border: 1px solid #d6dfeb; border-radius: 8px; padding: 10px; box-sizing: border-box; }
          .chart-box h4 { margin: 0 0 8px; color: #003366; font-size: 12px; text-align: center; }
          .chart-box img { width: 100%; max-width: 100%; height: auto; }
          .birth-sex-chart-wrap { display: flex; align-items: center; justify-content: center; gap: 16px; min-height: 180px; }
          .birth-sex-pie {
            width: 160px;
            height: 160px;
            border-radius: 50%;
            border: 1px solid #d6dfeb;
            background: conic-gradient(
              #1f77b4 0% ${compliantBirthSex.malePercent}%,
              #ff6384 ${compliantBirthSex.malePercent}% ${Number((compliantBirthSex.malePercent + compliantBirthSex.femalePercent).toFixed(1))}%,
              #94a3b8 ${Number((compliantBirthSex.malePercent + compliantBirthSex.femalePercent).toFixed(1))}% 100%
            );
            flex-shrink: 0;
          }
          .birth-sex-legend { display: grid; gap: 6px; font-size: 11px; }
          .birth-sex-legend-item { display: flex; align-items: center; gap: 6px; }
          .birth-sex-swatch { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
          .birth-sex-muted { color: #64748b; font-size: 10px; margin-top: 4px; }
          .progress-box { border: 1px solid #d6dfeb; border-radius: 8px; padding: 10px; margin-bottom: 12px; }
          .progress-box h4 { margin: 0 0 8px; color: #003366; font-size: 12px; text-align: center; }
          .kpi-row { display: flex; gap: 10px; justify-content: space-between; margin: 6px 0 10px; }
          .kpi-item { flex: 1; background: #f8fbff; border: 1px solid #d6dfeb; border-radius: 6px; padding: 6px; text-align: center; }
          .kpi-item .k { font-size: 10px; color: #475569; }
          .kpi-item .v { font-size: 15px; font-weight: 700; color: #003366; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #003366; color: white; }
          tbody tr:nth-child(even) { background: #f8fbff; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${institutionName}</h2>
          <h3>Gender and Development (GAD) Office</h3>
          <p>Annual Employee Compliance Report for CHED</p>
          <p class="generated-date">${generatedDateDisplay}</p>
        </div>

        <p class="section-title">Summary Text</p>
        <p class="summary-text">${escapeHtml(summaryText)}</p>

        <p class="section-title">Charts</p>
        <div class="charts-row">
          <div class="chart-box">
            <h4>Compliant Employees by Birth Sex (%)</h4>
            ${compliantBirthSex.totalCompliant > 0 ? `
              <div class="birth-sex-chart-wrap">
                <div class="birth-sex-pie" aria-label="Compliant Birth Sex Pie Chart"></div>
                <div class="birth-sex-legend">
                  <div class="birth-sex-legend-item">
                    <span class="birth-sex-swatch" style="background:#1f77b4;"></span>
                    <span>Male: ${compliantBirthSex.malePercent.toFixed(1)}% (${compliantBirthSex.maleCount})</span>
                  </div>
                  <div class="birth-sex-legend-item">
                    <span class="birth-sex-swatch" style="background:#ff6384;"></span>
                    <span>Female: ${compliantBirthSex.femalePercent.toFixed(1)}% (${compliantBirthSex.femaleCount})</span>
                  </div>
                  ${compliantBirthSex.otherPercent > 0 ? `
                    <div class="birth-sex-legend-item">
                      <span class="birth-sex-swatch" style="background:#94a3b8;"></span>
                      <span>Other/Intersex: ${compliantBirthSex.otherPercent.toFixed(1)}% (${compliantBirthSex.intersexCount + compliantBirthSex.otherCount})</span>
                    </div>
                  ` : ''}
                  <div class="birth-sex-muted">Base: ${compliantBirthSex.totalCompliant} compliant employees</div>
                </div>
              </div>
            ` : '<p class="birth-sex-muted" style="text-align:center; margin:0;">No compliant employee records yet.</p>'}
          </div>
          <div class="chart-box">
            <h4>Compliance per Department</h4>
            <img src="${departmentChartUrl}" alt="Compliance per Department Chart" />
          </div>
        </div>

        <div class="progress-box">
          <h4>Progress Chart</h4>
          <div class="kpi-row">
            <div class="kpi-item"><div class="k">Total Employees</div><div class="v">${totalEmployees}</div></div>
            <div class="kpi-item"><div class="k">Total Compliant</div><div class="v">${totalCompliant}</div></div>
            <div class="kpi-item"><div class="k">Total Non-Compliant</div><div class="v">${totalNonCompliant}</div></div>
            <div class="kpi-item"><div class="k">Compliance Rate (%)</div><div class="v">${complianceRatePercent.toFixed(1)}%</div></div>
          </div>
          <img src="${progressChartUrl}" alt="Progress Chart" />
        </div>

        <p class="section-title">Analysis</p>
        <p class="analysis-text">${analysisText}</p>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Dept</th>
              <th>Position</th>
              <th>Birth Sex</th>
              <th>Gender Identity</th>
              <th>Seminars Attended</th>
            </tr>
          </thead>
          <tbody>
            ${employeesRows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    // Avoid report failures when third-party chart image requests stay active too long.
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
    const pdfData = await page.pdf({ format: 'A4', printBackground: true });
    return Buffer.from(pdfData);
  } finally {
    if (browser) await browser.close();
  }
};
