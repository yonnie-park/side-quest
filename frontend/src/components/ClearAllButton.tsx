import "./ClearAllButton.css";

interface ClearAllButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function ClearAllButton({
  onClick,
  disabled,
}: ClearAllButtonProps) {
  return (
    <button className="clear-all-button" onClick={onClick} disabled={disabled}>
      clear all
    </button>
  );
}
