import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import ForgotForm from '../components/ForgotForm';
export default function ForgotPasswordPage() {
  return <AuthShell title="Forgot password?" subtitle="We’ll email you a reset link if an email is on file. You can also ask the owner to set a new password for you.">
    <ForgotForm /><Link to="/login" className="mt-4 block text-center text-sm text-blue-600 hover:underline">Back to login</Link></AuthShell>;
}
