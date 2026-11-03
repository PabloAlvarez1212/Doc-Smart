import RecentNotifications from "../../../ui/Notifications/RecentNotifications";

export default function Notifications({ notifications = [], unread = 0, loading = false, error = null, onMarcarLeida, onRetry }) {
    return (
        <RecentNotifications
            role="patient"
            titleId="recent-notifications-title"
            title="Últimas notificaciones"
            description="Novedades importantes sobre tu atención."
            href="/patient/notifications"
            notifications={notifications}
            unread={unread}
            loading={loading}
            error={error ? "Inténtalo nuevamente en unos momentos." : null}
            onRead={onMarcarLeida}
            onRetry={onRetry}
        />
    );
}
