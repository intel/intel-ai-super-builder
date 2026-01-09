import "./HighLowTooltipDescription.css"
import { Button, Tooltip } from "@mui/material";
import { useTranslation } from "react-i18next";
import InfoIcon from '@mui/icons-material/InfoOutlined';

const HighLowTooltipDescription = ({
  overall_description,
  high_description,
  low_description,
  isButton = false,
  onClick,
  children,
}) => {
  const { t } = useTranslation();

  const tooltipContent = (
    <span>
      {overall_description}
      {high_description && low_description && (
        <span>
          <br />
          <br />
          <b>{t("setting.parameters.high_value")} </b> {high_description}
          <br />
          <br />
          <b>{t("setting.parameters.low_value")} </b> {low_description}
        </span>
      )}
    </span>
  );

  return (
    <Tooltip
      title={tooltipContent}
      enterDelay={0}
      leaveDelay={0}
      placement="bottom-start"
    >
      {children ||
        (isButton ? (
          <Button
            data-testid="tooltip-info-button"
            onClick={onClick}
            sx={{ padding: 0, border: 'none', background: 'none' }}
          >
            {/* <img
              className="infoshape"
              src="/images/normal_u151.svg"
              alt="Info Icon"
            /> */}
            <InfoIcon color="primary" fontSize="small"/>
          </Button>
        ) : (
          // <img
          //   className="infoshape"
          //   src="/images/normal_u151.svg"
          //   alt="Info Icon"
          // />
          <InfoIcon color="primary" fontSize="inherit"/>
        ))}
    </Tooltip>
  );
};

export default HighLowTooltipDescription;