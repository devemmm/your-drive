import { cn } from "@/lib/utils";
import PersonIcon from "./person-icon";

interface SeatState {
  id: number;
  status: "available" | "booked" | "selected" | "unavailable";
  price?: number;
  rating?: number;
  reviews?: number;
}

interface AdvancedSeatVisualizationProps {
  seats: SeatState[];
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  showPrices?: boolean;
  className?: string;
  onSeatClick?: (seatId: number) => void;
  interactive?: boolean;
}

const AdvancedSeatVisualization = ({
  seats,
  size = "md",
  showCount = true,
  showPrices = false,
  className,
  onSeatClick,
  interactive = false,
}: AdvancedSeatVisualizationProps) => {
  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  const getSeatColor = (status: SeatState["status"]) => {
    switch (status) {
      case "booked":
        return "hsl(var(--primary))";
      case "selected":
        return "hsl(var(--green-600))";
      case "unavailable":
        return "hsl(var(--destructive))";
      case "available":
      default:
        return "hsl(var(--muted-foreground))";
    }
  };

  const getSeatContainerStyles = (status: SeatState["status"]) => {
    if (!interactive) return "";

    switch (status) {
      case "available":
        return "cursor-pointer hover:scale-110 transition-transform";
      case "selected":
        return "cursor-pointer hover:scale-110 transition-transform";
      default:
        return "cursor-not-allowed";
    }
  };

  const availableSeats = seats.filter(
    (seat) => seat.status === "available"
  ).length;
  const totalSeats = seats.length;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-1 flex-wrap">
        {seats.map((seat) => (
          <div
            key={seat.id}
            className={cn(
              "relative group",
              getSeatContainerStyles(seat.status)
            )}
            onClick={() => {
              if (
                interactive &&
                onSeatClick &&
                (seat.status === "available" || seat.status === "selected")
              ) {
                onSeatClick(seat.id);
              }
            }}
          >
            <PersonIcon
              size={sizeMap[size]}
              filled={seat.status !== "available"}
              color={getSeatColor(seat.status)}
              className="transition-all duration-200"
            />

            {/* Tooltip for seat information */}
            {showPrices && seat.price && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                <div className="font-semibold">${seat.price}</div>
                {seat.rating && (
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400">★</span>
                    <span>{seat.rating}</span>
                    {seat.reviews && <span>({seat.reviews})</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {showCount && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Available: {availableSeats} / {totalSeats}
          </span>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <PersonIcon
                size={12}
                filled={false}
                color="hsl(var(--muted-foreground))"
              />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1">
              <PersonIcon size={12} filled={true} color="hsl(var(--primary))" />
              <span>Booked</span>
            </div>
            {interactive && (
              <div className="flex items-center gap-1">
                <PersonIcon
                  size={12}
                  filled={true}
                  color="hsl(var(--green-600))"
                />
                <span>Selected</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSeatVisualization;
