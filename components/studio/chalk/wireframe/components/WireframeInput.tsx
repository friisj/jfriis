import type { InputComponent } from "@/lib/studio/chalk/wireframe/schema";

type Props = InputComponent["props"];

export function WireframeInput({ label, placeholder, type, required }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-mono text-gray-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        className="border-2 border-gray-800 bg-white px-3 py-2 font-mono text-sm focus:outline-none focus:border-gray-600"
        readOnly
      />
    </div>
  );
}
