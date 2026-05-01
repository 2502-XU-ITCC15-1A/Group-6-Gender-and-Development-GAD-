/* Canonical Xavier University departments grouped by cluster.
   Used by signup (autocomplete) and admin filters (cluster + department). */
window.XU_DEPARTMENTS = {
  'Executive / University Administration': [
    'Office of the President',
    'Office of the Vice President for Higher Education',
    'Office of Mission and Ministry',
    'Office of International Cooperation and Networking',
    'Quality Management Office',
    'Communications / Promotions Office',
  ],
  'Academic Administration': [
    'University Registrar',
    'Testing and Admissions Office',
    'Office of Graduate Studies',
    'University Libraries',
    'Kinaadman University Research Office',
  ],
  'Finance / HR / Operations': [
    'Finance Office',
    'Accounting Office',
    'Human Resources Office',
    'Procurement / Purchasing Office',
    'Information Technology / CISO / MIS',
    'Physical Plant Office',
    'Campus Development Office',
  ],
  'Student Formation / Student Services': [
    'Office of Student Affairs',
    'Guidance and Counseling Office',
    'Campus Ministries Office',
    'University Athletics Office',
    'National Service Training Program (NSTP) Office',
    'Xavier Center for Culture and the Arts',
    'Alumni Affairs Office',
    'Chaplaincy',
  ],
  'Social Development / Outreach': [
    'Social Development Office',
    'Student Social Formation Office / Unit',
    'SEARSOLIN / Outreach Units',
  ],
  'Support / Non-Teaching / Operations': [
    'Campus Safety, Security and Information Office',
    'Health Services Office',
    'Clinic / Medical Services Unit',
    'Maintenance Unit',
    'Custodial / Janitorial Unit',
    'Groundskeeping / Landscaping Unit',
    'Utilities / Electrical / Plumbing Unit',
    'Canteen / Food Service Personnel',
  ],
  'College of Agriculture': [
    'Agriculture Department',
    'Agricultural Engineering Department',
    'Agribusiness Department',
    'Food Technology Department',
    'Development Communication Department',
  ],
  'College of Arts and Sciences': [
    'Biology Department',
    'Chemistry Department',
    'Department of English Language and Literature',
    'Filipino Department',
    'History, International Studies, and Political Science Department',
    'Mathematics Department',
    'Philosophy Department',
    'Psychology Department',
    'Sociology and Anthropology Department',
    'Economics Department',
  ],
  'College of Computer Studies': [
    'Computer Science Department',
    'Information Technology Department',
    'Information Systems Department',
    'Entertainment and Multimedia Computing Department',
  ],
  'College of Engineering': [
    'Chemical Engineering Department',
    'Civil Engineering Department',
    'Electrical Engineering Department',
    'Electronics Engineering Department',
    'Industrial Engineering Department',
    'Mechanical Engineering Department',
  ],
  'College of Nursing': [
    'Nursing Department',
  ],
  'School of Business and Management': [
    'Accountancy Department',
    'Business Administration Department',
    'Marketing Management Department',
    'Financial Management Department',
    'Business Economics Department',
    'Real Estate Management Department',
  ],
  'School of Education': [
    'Elementary Education Department',
    'Secondary Education Department',
    'Special Needs Education Department',
  ],
  'Professional Schools': [
    'School of Law',
    'School of Medicine',
    'Graduate School',
  ],
};

window.XU_CLUSTERS = Object.keys(window.XU_DEPARTMENTS);

window.XU_DEPARTMENT_TO_CLUSTER = (() => {
  const map = {};
  for (const cluster of window.XU_CLUSTERS) {
    for (const dept of window.XU_DEPARTMENTS[cluster]) {
      map[dept] = cluster;
    }
  }
  return map;
})();

window.XU_ALL_DEPARTMENTS = window.XU_CLUSTERS.flatMap(
  (cluster) => window.XU_DEPARTMENTS[cluster]
);
