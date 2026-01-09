import { useContext, useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener"
import { ModelDownloaderContext } from "../context/ModelDownloaderContext";
import { useTranslation } from 'react-i18next';
import Link from '@mui/material/Link';

const ModelLink = ({ displayText = "View Model Card", modelName, getLink }) => {
  const { t } = useTranslation();
  const { getSanitizedModelLink } = useContext(ModelDownloaderContext);
  const [safeURL, setSafeURL] = useState(null);

  useEffect(() => {
    const fetchSafeURL = async () => {
      // get model link from context
      let url;
      if (getLink) {
        url = await getLink(modelName); // Await the Promise because getLink is async
      } else {
        url = getSanitizedModelLink(modelName);
      }
      setSafeURL(url);
    };

    fetchSafeURL();
  }, [getLink, getSanitizedModelLink, modelName]);

  // return clickable link only if valid sanitized URL, otherwise return nothing
  return safeURL ? (
    <Link
      data-testid="model-view-card-link"
      onClick={async (e) => {
        if (safeURL) {
          await openUrl(safeURL);
        }
      }}
      sx={{
        cursor: 'pointer',
        '&:hover': {
          textDecoration: 'underline'
        }
      }}
      target="_blank"
      rel="noopener noreferrer"
    >
      {t('topbar.view_model_link')}
    </Link>
  ) : null;
};

export default ModelLink;
