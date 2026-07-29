import { cn } from "@/lib/utils";
import PersonIcon from "./person-icon";

interface SeatVisualizationProps {
  totalSeats: number;
  availableSeats: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  className?: string;
}

const SeatVisualization = ({
  totalSeats,
  availableSeats,
  size = "md",
  showCount = true,
  className,
}: SeatVisualizationProps) => {
  const bookedSeats = totalSeats - availableSeats;

  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {new Array(totalSeats).fill("").map((_, i) => (
        <div key={i} className="relative">
          <PersonIcon
            size={sizeMap[size]}
            filled={i < bookedSeats}
            color={
              i < bookedSeats
                ? "hsl(var(--primary))"
                : "hsl(var(--muted-foreground))"
            }
            className="transition-all duration-200"
          />
        </div>
      ))}
    </div>
  );
};

export default SeatVisualization;
