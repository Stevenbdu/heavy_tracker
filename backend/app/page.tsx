export default function Home() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Heavy Tracker — API</h1>
      <p>Backend opérationnel.</p>
      <h2>Routes disponibles</h2>
      <ul>
        <li><a href="/api/hello">/api/hello</a> — test connexion DB</li>
        <li>/api/programs</li>
        <li>/api/sessions</li>
        <li>/api/metrics</li>
      </ul>
    </main>
  );
}
