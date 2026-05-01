export default function Spinner({ className = 'py-20' }: { className?: string }) {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div className="w-8 h-8 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin" />
    </div>
  );
}
