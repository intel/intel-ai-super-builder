import NotificationContent from "./NotificationContent";
import React, { useEffect, useState, useContext } from "react";
import { invoke } from "@tauri-apps/api/core";
import { compareVersions } from "compare-versions";
import { Button } from "@mui/material";
import "./Notification.css";
import FluidModal from "../FluidModal/FluidModal";

import useDataStore from "../../stores/DataStore";
import { useTranslation } from 'react-i18next';

//Note: there is a lot of code hacks here to "fix" the xml and markdown that comes from the manifest as it is
//currently formatted. AAB-913 has been created to address this.

const Notification = ({ isOpen, toggleOpen, assistant }) => {
  const { t } = useTranslation();
  const sysVersion = useDataStore((state) => state.system_info?.CurrentVersion);
  const [isUpdateRequired, setIsUpdateRequired] = useState(1);

  useEffect(() => {
    const CheckForUpdate = async () => {
      const notifData = await getNotificationData();
      const remoteVersion = notifData.version;
      console.log("local version: ", sysVersion, " remote vers: ", remoteVersion);
      const version_comparison = compareVersions(sysVersion, remoteVersion);
      console.dir(version_comparison)
      if (version_comparison == -1) {
        console.log("remote version is latest")
      }
      else {
        console.log("local version is latest")
      }
      setIsUpdateRequired(version_comparison)
      if (version_comparison == -1) {
        toggleOpen();
      }
    }

    if (sysVersion && sysVersion != '') {
      CheckForUpdate();
    }

  }, [sysVersion]);

  function parseUpgradePackage(encodedXml) {
    // Decode the HTML entities
    // Use DOMParser to parse the XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(encodedXml, "application/xml");
    // Initialize an object to hold the extracted data
    var packageData = [];
    // Extract fields from the XML
    // Add handling multiple upgrade packages
    const upgradePackages = xmlDoc.querySelectorAll("UpgradePackage");
    upgradePackages.forEach((upgradePackage) => {
      var tmpPackage = {};

      if (upgradePackage) {
        tmpPackage.version = upgradePackage.getAttribute("Version");
        tmpPackage.date = upgradePackage.getAttribute("Date");
        tmpPackage.productName = upgradePackage.getAttribute("ProductName");
      }

      const installURLLink = upgradePackage.querySelector("InstallURL Link");
      if (installURLLink) {
        tmpPackage.installURL = installURLLink.textContent;
      }

      const releaseNotes = upgradePackage.querySelector("ReleaseNotes");
      if (releaseNotes) {
        tmpPackage.releaseNotes = releaseNotes.textContent;
      }

      const homepage = upgradePackage.querySelector("Homepage");
      if (homepage) {
        tmpPackage.homepage = homepage.textContent;
      }
      packageData.push(tmpPackage);
    });

    // Sort by descending version number
    packageData = packageData.sort((a, b) => { return !compareVersions(a.version, b.version) });
    return packageData;
  }

  const initData = () => {
    let init_data = {
      version: "version",
      date: "date",
      install_url: "install url",
      release_notes: "release notes",
    };

    return init_data;
  };

  const [data, setData] = useState(() => {
    return initData();
  });

  const getNotificationData = async () => {
    try {
      const notification = await invoke("update_notification");

      // Retrieved notification is in XML format
      const packageData = parseUpgradePackage(notification);
      let data_for_notification_test = {
        version: "error",
        date: "date",
        install_url: "install url",
        release_notes: "release notes",
      };
      if (packageData.length > 0) {
        data_for_notification_test = {
          version: packageData[0].version,
          date: packageData[0].date,
          install_url: packageData[0].homepage,
          // release_notes: packageData.map(item => item.releaseNotes).join('\n&nbsp;\n'),
          release_notes: packageData
        };
      }

      setData(data_for_notification_test);
      return data_for_notification_test;
    } catch (error) {
      console.log(error);
      setData("");
      return null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      getNotificationData();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }


  var footerContent = undefined

  if (isUpdateRequired == -1) {
    // new update detected
    footerContent = <>
      <div className="notification">
          <div className="item1">
            <Button
              size="m"
              variant="text"
              onClick={toggleOpen}
              data-testid="notification-close-button"
            >
              {t('notification.close_button')}
            </Button>
          </div>
          <div className="item2">
            <a rel="noopener noreferrer" target="_blank" href={data.install_url}>
              <Button
                size="m"
                variant="contained"
                data-testid="notification-portal-button"
              >
                {t('notification.portal_button')}
              </Button>
            </a>
          </div>

      </div>
    </>
  }

  return (
    <FluidModal open={isOpen} handleClose={toggleOpen} header={t('notification.header')} assistant={assistant} footer={footerContent} data-testid="notification-modal">
      <NotificationContent
        version={data.version}
        date={data.date}
        install_url={data.install_url}
        release_notes={data.release_notes}
        installedVersion={sysVersion}
        isUpdateRequired={isUpdateRequired}
      />
    </FluidModal>
  );
};


export default Notification;