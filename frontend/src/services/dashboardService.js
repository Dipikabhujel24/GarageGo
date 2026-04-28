const dashboardSummary = [
  { label: 'Vehicles In Service', value: '42' },
  { label: 'Open Work Orders', value: '18' },
  { label: 'Monthly Revenue', value: '$58,400' },
];

export function fetchDashboardSummary() {
  return Promise.resolve(dashboardSummary);
}
