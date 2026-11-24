import Notification from './Notification'

const NotificationContainer = ({ notifications, onRemove }) => {
  // The container owns the position and stacking: toasts flow in a column so
  // they never sit on top of each other, and sit above the import modal
  // (10500) and the walkthrough (10000) so their messages stay readable.
  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 11000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
        pointerEvents: 'none'
      }}
    >
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onClose={() => onRemove(notification.id)}
        />
      ))}
    </div>
  )
}

export default NotificationContainer