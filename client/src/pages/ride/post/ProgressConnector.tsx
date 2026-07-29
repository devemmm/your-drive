const ProgressConnector = ({ isActive }) => (
  <div
    className={`flex-1 h-2 mx-2 ${
      isActive
        ? "bg-green-600 dark:bg-green-600"
        : "bg-gray-200 dark:bg-gray-700"
    }`}
  ></div>
);
export default ProgressConnector;
