import DashboardClient from './components/DashboardClient';

export const metadata = {
  title: 'Patient Dashboard | HealthAI',
  description: 'View your health tourism itinerary and past visits.',
};

export default function PatientDashboardPage() {
  return <DashboardClient />;
}
