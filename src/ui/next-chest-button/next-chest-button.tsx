import "./next-chest-button.scss";
import React from "react";

interface NextChestButtonProps {
  onClick: () => void;
}

export const NextChestButton: React.FC<NextChestButtonProps> = ({
  onClick,
}) => {
  return (
    <div className="next-chest-button" onClick={onClick}>
      Next chest
    </div>
  );
};
