const dashboardSummary = [
  { label: 'Vehicles In Service', value: '42' },
  { label: 'Open Work Orders', value: '18' },
  { label: 'Monthly Revenue', value: 'Rs58,400' },
];

export function fetchDashboardSummary() {
  return Promise.resolve(dashboardSummary);
}
