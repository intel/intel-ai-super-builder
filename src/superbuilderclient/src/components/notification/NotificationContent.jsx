import "./NotificationContent.css";
import ai_assistant_builder_icon from "../../assets/images/icon.png";
import MarkdownRenderer from "../../helpers/MarkdownRenderer";
import { useTranslation } from 'react-i18next';

const NotificationContent = ({
  version,
  date,
  release_notes,
  installedVersion,
  isUpdateRequired,
}) => {
  const { t } = useTranslation();
  return (
    <div>
      {version == "version" && (
        <div className="loading-container" data-testid="notification-loading-state">
          <div className="loading-spinner"></div>
          <p>{t('notification.fetch_update')}</p>
        </div>
      )}
      {version == "error" && (
        <div className="loading-container" data-testid="notification-error-state">
          <p>{t('notification.failed_to_fetch_update')}</p>
        </div>
      )}
      {version != "version" && version != "error" && (
        <>

          <div className="ai_assistant_builder_header" data-testid="notification-update-info">
            <div className="flex-container">
              <div className="flex-items">
                <img width={64} src={ai_assistant_builder_icon} />
              </div>
              <div className="flex-items">
                <div className="text">
                  <h2>{t('notification.title')}</h2>
                  {isUpdateRequired == -1 && (
                    <>
                      <h3>{t('notification.update_available')}</h3>
                    </>
                  )}
                  {isUpdateRequired == 1 && (
                    <>
                      <h3>{t('notification.update_to_date')}</h3>
                    </>
                  )}
                  <span>{t('notification.install_version')} {installedVersion}</span>
                  {isUpdateRequired == -1 && (
                    <>
                      <br />
                      <span>{t('notification.update_version')} {version}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <hr />

          {release_notes.map((item, index) => {
            const date = new Date(item.date);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
            const day = String(date.getDate()).padStart(2, '0');
            const formattedDate = `${year}/${month}/${day}`;
            return (
              <div key={index} className="notification-body" data-testid={`notification-release-note-${item.version}`}>
                <h2>Release v{item.version} <span style={{ fontSize: "0.65em", fontStyle: "italic", fontWeight: "normal" }}>{formattedDate}</span></h2>
                <MarkdownRenderer content={item.releaseNotes} />
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

export default NotificationContent;
