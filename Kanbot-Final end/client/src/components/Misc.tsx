import { Link } from 'react-router';

export function NotFound() {
  return <main className="fullpage"><h1>Page not found</h1><Link className="btn primary" to="/">Go home</Link></main>;
}
export function ComingSoon({ title }: { title: string }) {
  return <><h1>{title}</h1><p className="muted">This page is built in the next step.</p></>;
}
