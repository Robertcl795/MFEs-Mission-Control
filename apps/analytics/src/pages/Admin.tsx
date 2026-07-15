export function Admin() {
  return (
    <section className="mc-card">
      <h2>Analytics administration</h2>
      <p>
        You can only see this because the session has the <code>admin</code> permission. Toggle it in the shell
        header and this route locks itself again.
      </p>
    </section>
  );
}
