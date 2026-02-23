import "./AutoPickButton.css";

interface AutoPickButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function AutoPickButton({
  onClick,
  disabled,
}: AutoPickButtonProps) {
  return (
    <button className="auto-pick-button" onClick={onClick} disabled={disabled}>
      auto pick
    </button>
  );
}
