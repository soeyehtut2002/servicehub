import { Clock, CheckCircle, CheckCheck, XCircle, PauseCircle } from 'lucide-react';

const ICON_SIZE = 12;

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   className: 'badge-warning', Icon: Clock },
  confirmed: { label: 'Confirmed', className: 'badge-primary', Icon: CheckCircle },
  completed: { label: 'Completed', className: 'badge-success', Icon: CheckCheck },
  cancelled: { label: 'Cancelled', className: 'badge-danger',  Icon: XCircle },
  paused:    { label: 'Paused',    className: 'badge-muted',   Icon: PauseCircle },
};

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || { label: status, className: 'badge-muted', Icon: Clock };
  const { Icon } = config;
  return (
    <span className={`badge ${config.className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Icon size={ICON_SIZE} strokeWidth={2.2} />
      {config.label}
    </span>
  );
};

export default StatusBadge;
