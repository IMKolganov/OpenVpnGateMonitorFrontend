import { FaPlay } from "react-icons/fa";

type Props = {
  serviceStatus: string;
  nextRunTime: string;
  onRunNow: () => void;
};

export default function ServiceControls({ serviceStatus, nextRunTime, onRunNow }: Props) {
  const renderStatusDescription = () => {
    switch (serviceStatus) {
      case "Idle":
        return "The service is currently idle and waiting for the next scheduled run.";
      case "Running":
        return "The service is actively querying the OpenVPN server and saving data to the database.";
      case "Error":
        return "An error occurred while the service was running. Please check the logs for details.";
      default:
        return "Unknown service status.";
    }
  };

  return (
    <div className="service-status-container">
      <h2>Service Control</h2>
      <p>
        <strong>Service Status:</strong> {serviceStatus}
      </p>
      <p className="description">{renderStatusDescription()}</p>
      <p>
        <strong>Next Run:</strong> {nextRunTime}
      </p>
      <p className="description">
        This service periodically queries the OpenVPN server to collect data about connected clients
        and stores this information in the database. Use the button below to manually trigger the service
        and update the data immediately.
      </p>
      <button
        className="btn primary"
        onClick={onRunNow}
        disabled={serviceStatus === "Running"}
      >
        <FaPlay /> Run Now
      </button>
    </div>
  );
}
