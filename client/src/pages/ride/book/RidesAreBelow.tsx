import RideCard from "./RideCard";

const RidesAreBelow = ({ date, ridesArray, navigate, t, userLocale, key }) => {
  return (
    <div key={key}>
      <div className="bg-primary/10 dark:bg-primary/20 p-3">
        <h2 className="text-base font-semibold text-primary">
          {new Date(date)
            .toLocaleDateString(userLocale, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })
            .replace(/^([a-zéèêàâîïç])/u, (match) => match.toUpperCase()) !==
          "Invalid Date"
            ? new Date(date)
                .toLocaleDateString(userLocale, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
                .replace(/^([a-zéèêàâîïç])/u, (match) => match.toUpperCase())
            : date}
          {/* {date} */}
        </h2>
      </div>
      <div className="">
        {ridesArray.map((ride) => (
          <RideCard
            key={ride.id}
            ride={ride}
            navigate={navigate}
            t={t}
            userLocale={userLocale}
          />
        ))}
      </div>
    </div>
  );
};
export default RidesAreBelow;
