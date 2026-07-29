import {
  DraggableCardBody,
  DraggableCardContainer,
} from "@/components/ui/draggable-card";
import { useReactItems } from "@/lib/ReactTranslation";

export function DraggableCards() {
  const { t } = useReactItems();

  const items = [
    {
      title: "Rides",
      image:
        "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&h=600&fit=crop",
      className: "absolute top-[10%] left-[5%] rotate-[-5deg]",
    },
    {
      title: "Delivery",
      image:
        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=600&fit=crop",
      className: "absolute top-[40%] left-[22%] rotate-[-7deg]",
    },
    {
      title: "Rental",
      image:
        "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&h=600&fit=crop",
      className: "absolute top-[5%] left-[40%] rotate-[8deg]",
    },
    {
      title: "Pay",
      image:
        "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop",
      className: "absolute top-[32%] left-[55%] rotate-[10deg]",
    },
  ];
  return (
    <DraggableCardContainer className="relative flex min-h-[80vh] w-full items-center justify-center">
      <p className="absolute top-1/2 mx-auto max-w-sm -translate-y-3/4 text-center text-2xl font-black text-neutral-400 md:text-3xl dark:text-neutral-800">
        {t("common_.cardsTitle")}
      </p>
      {items.map((item, index) => (
        <DraggableCardBody
          key={index}
          className={`${item.className} cursor-grab`}
        >
          <img
            src={item.image}
            alt={item.title}
            className="pointer-events-none relative z-10 h-80 w-80 object-cover"
          />
          <h3 className="mt-4 text-center text-2xl font-bold text-neutral-700 dark:text-neutral-300">
            {item.title}
          </h3>
        </DraggableCardBody>
      ))}
    </DraggableCardContainer>
  );
}
