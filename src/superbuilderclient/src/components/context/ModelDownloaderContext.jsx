import { createContext, useState } from "react";
import DOMPurify from "dompurify";

import useDataStore from "../../stores/DataStore";

const ModelDownloaderContext = createContext({
  isInitDownload: false,
  downloadInProgress: false,
  downloadData: [],
  setIsInitDownload: () => {},
  setDownloadInProgress: () => {},
  setDownloadData: () => {},
  setDownloadEndpoint: () => {},
});

const ModelDownloaderProvider = ({ children }) => {
  const { config, setConfig } = useDataStore();
  const [isInitDownload, setIsInitDownload] = useState(false);
  const [downloadInProgress, setDownloadInProgress] = useState(false);
  const [downloadData, setDownloadData] = useState([]);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const [downloadConsent, setDownloadConsent] = useState(false);
  const [downloadWindowsOpen, setDownloadWindowsOpen] = useState(false);
  const [waitingForConsent, setWaitingForConsent] = useState(false);
  const [modelCards, setModelCards] = useState([]);

  const setDownloadEndpoint = (endpoint) => {
    const updatedConfig = {
      ...config,
      download_endpoint: endpoint,
    };
    setConfig(updatedConfig);
  };

  // return sanitized URL, otherwise return null
  const sanitizeAndValidateUrl = (url) => {
    const sanitizedUrl = DOMPurify.sanitize(url);
    const isValidUrl = (url) => {
      try {
        const parsedUrl = new URL(url);
        return ["http:", "https:"].includes(parsedUrl.protocol);
      } catch (e) {
        return false;
      }
    };
    return isValidUrl(sanitizedUrl) ? sanitizedUrl : null;
  };

  // return sanitized model link, otherwise return null
  const getSanitizedModelLink = (modelName) => {
    console.log("modelCards contents", modelCards);
    const model = modelCards.find((model) => model.full_name === modelName);
    if (!model) {
      return null; // early return
    }

    let url = "";
    if (model.model_card) {
      url = model.model_card;
    } else if (model.download_link) {
      url = model.download_link;
    }

    if (url) {
      try {
        const urlObj = new URL(url);
        const basePath = `${urlObj.protocol}//${urlObj.host}`;

        // Only replace the base URL if it's not "https://aibuilder.intel.com"
        if (basePath !== "https://aibuilder.intel.com") {
          const modelEndpointObj = new URL(config.download_endpoint);
          urlObj.protocol = modelEndpointObj.protocol;
          urlObj.host = modelEndpointObj.host;
          url = urlObj.toString();
          url = removeModelsFromUrl(url)
        }
      } catch (error) {
        console.error("Invalid URL:", error);
        return null;
      }

      // When the endpoint is set to modelscope outside of PRC,
      // the retrieved commit_id corresponds to the value on HuggingFace, resulting in an invalid URL.
      // Therefore, only HuggingFace(hf-mirror) will concatenate the commit_id.
      if (
        url &&
        model.commit_id &&
        (url.indexOf("https://huggingface.co") == 0 ||
          url.indexOf("https://hf-mirror.com") == 0)
      ) {
        url = `${url}/tree/${model.commit_id}`;
      }
    }
    return sanitizeAndValidateUrl(url);
  };

  const getDownloadLink = async (modelName) => {
    console.log("modelCards contentss", modelCards, modelName);
    const model = modelCards.find((model) => model.full_name === modelName);
    if (!model) {
      return "";
    }
    let url = model.download_link;

    if (url) {
      console.warn(url);
      try {
        const urlObj = new URL(url);
        const basePath = `${urlObj.protocol}//${urlObj.host}`;
        if (basePath !== "https://aibuilder.intel.com") {
          const modelEndpointObj = new URL(config.download_endpoint);
          urlObj.protocol = modelEndpointObj.protocol;
          urlObj.host = modelEndpointObj.host;
          url = urlObj.toString();
          url = removeModelsFromUrl(url)
          console.warn("url", url);
        }
      } catch (error) {
        console.error("Invalid URL:", error);
        return null;
      }

      // When the endpoint is set to modelscope outside of PRC,
      // the retrieved commit_id corresponds to the value on HuggingFace, resulting in an invalid URL.
      // Therefore, only HuggingFace(hf-mirror) will concatenate the commit_id.
      if (
        url &&
        model.commit_id &&
        (url.indexOf("https://huggingface.co") == 0 ||
          url.indexOf("https://hf-mirror.com") == 0)
      ) {
        url = `${url}/tree/${model.commit_id}`;
      }
    }
    //return download link, if not exists model card, if not empty string.
    // console.log("couldnt find for ", modelName);
    return url;
  };

  //remove '/models/' in the download_url or model_card field. ('/models/ from modelscope link')
  const removeModelsFromUrl = (urlString) => {
    try {
      const url = new URL(urlString);
      // Split path into array and filter out empty parts
      const pathParts = url.pathname.split("/").filter((part) => part !== "");

      // Remove the first occurrence of "models" (case-insensitive)
      if (pathParts.length > 0 && pathParts[0].toLowerCase() === "models") {
        pathParts.shift();
      }

      // Rebuild path while preserving original trailing slash state
      let newPath = pathParts.join("/");
      if (url.pathname.endsWith("/") && !newPath.endsWith("/")) {
        newPath += "/";
      }

      // Reconstruct new URL (automatically preserves query and hash)
      url.pathname = newPath;
      return url.toString();
    } catch (e) {
      return null; // Return null for invalid URLs
    }
  };

  return (
    <ModelDownloaderContext.Provider
      value={{
        isInitDownload,
        setIsInitDownload,
        downloadInProgress,
        setDownloadInProgress,
        downloadData,
        setDownloadData,
        downloadFailed,
        setDownloadFailed,
        downloadConsent,
        setDownloadConsent,
        downloadWindowsOpen,
        setDownloadWindowsOpen,
        waitingForConsent,
        setWaitingForConsent,
        getSanitizedModelLink,
        setModelCards,
        getDownloadLink,
        setDownloadEndpoint,
        removeModelsFromUrl,
      }}
    >
      {children}
    </ModelDownloaderContext.Provider>
  );
};

export { ModelDownloaderContext, ModelDownloaderProvider };
