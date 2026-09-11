import { execFileSync } from 'node:child_process';

// Public application credentials, verified against www.notewithprism.com.
// This is the low-privilege anon key, NOT a service_role key or user session.
const projectRef = 'uezpbmuprzxmyiuuhuej';
const publicKey = process.env.PRISM_SUPABASE_PUBLIC_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlenBibXVwcnp4bXlpdXVodWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMjMyMzIsImV4cCI6MjA5ODg5OTIzMn0.VvuQquR0KEeqoH82YtZWC6RifYZHLzvdEzHyODfhHyw';

function checkDatabase() {
  if (!publicKey.startsWith('sb_publishable_')) {
    const claims = JSON.parse(Buffer.from(publicKey.split('.')[1] || '', 'base64url'));
    if (claims.role !== 'anon' || claims.ref !== projectRef) {
      throw new Error('Expected an anon key for the Prism project. Privileged keys are not accepted.');
    }
  }

  // PostgREST executes a real SELECT under the existing anon/RLS permissions.
  // Request only an ID; never retrieve note bodies or change any records.
  const url = `https://${projectRef}.supabase.co/rest/v1/notes?select=id&limit=1`;
  let output;
  try {
    output = execFileSync(process.platform === 'win32' ? 'curl.exe' : 'curl', [
      '--silent', '--show-error', '--proto', '=https',
      '--connect-timeout', '10', '--max-time', '20',
      '--retry', '2', '--retry-delay', '5', '--retry-max-time', '65',
      '--header', `apikey: ${publicKey}`,
      '--header', 'Accept: application/json',
      '--header', 'Cache-Control: no-cache',
      '--write-out', '\n%{http_code}', url,
    ], { encoding: 'utf8', timeout: 90000, maxBuffer: 65536, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {
    throw new Error('Database request failed at the network layer. Check connectivity and project status.');
  }
  const separator = output.lastIndexOf('\n');
  const status = output.slice(separator + 1).trim();
  if (status !== '200') {
    throw new Error(`Database health check returned HTTP ${status}. Check project status and API permissions.`);
  }
  let rows;
  try {
    rows = JSON.parse(output.slice(0, separator));
  } catch {
    throw new Error('Database returned HTTP 200 but not valid JSON. Health check failed.');
  }
  if (!Array.isArray(rows)) throw new Error('Unexpected database response: expected a JSON array.');
  if (rows.length !== 0) {
    throw new Error('Anonymous access returned a note ID. Review notes RLS policies; response data was not logged.');
  }
  console.log(`${new Date().toISOString()} Prism database OK: HTTP 200; anonymous SELECT returned no rows.`);
}

try {
  checkDatabase();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
