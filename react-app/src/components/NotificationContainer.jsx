import Notification from './Notification'

const NotificationContainer = ({ notifications, onRemove }) => {
  return (
    <div style={{ position: 'fixed', top: 0, right: 0, zIndex: 1000 }}>
      {notifications.map((notification, index) => (
        <div 
          key={notification.id}
          style={{
            marginTop: index * 60 + 'px' // Stack notifications vertically
          }}
        >
          <Notification
            message={notification.message}
            type={notification.type}
            duration={notification.duration}
            onClose={() => onRemove(notification.id)}
          />
        </div>
      ))}
    </div>
  )
}

export default NotificationContainer