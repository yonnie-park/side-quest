import "./AutoPickButton.css";

interface AutoPickButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  highlight?: boolean;
}

export default function AutoPickButton({
  onClick,
  disabled,
  label = "auto pick",
  highlight = false,
}: AutoPickButtonProps) {
  return (
    <button
      className={`auto-pick-button${highlight ? " auto-pick-highlight" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
