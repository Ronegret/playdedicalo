export default function ShaderBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-background"
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-95"
        style={{ backgroundImage: "url('/images/background-dark.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-surface/35 via-background/35 to-background/80" />
      <div className="absolute inset-0 animated-mesh opacity-55 mix-blend-screen" />
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-vinyl-orange/25 blur-3xl" />
      <div className="absolute top-8 right-0 h-64 w-64 rounded-full bg-electric-purple/18 blur-3xl" />
      <div className="absolute bottom-0 left-1/2 h-56 w-[32rem] -translate-x-1/2 rounded-full bg-deep-blue/22 blur-3xl" />
    </div>
  );
}
