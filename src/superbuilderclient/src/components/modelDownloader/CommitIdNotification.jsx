import {
  Alert,
  AlertTitle,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import useDataStore from "../../stores/DataStore";
import { Circle } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

const CommitIdNotification = () => {
  const { t } = useTranslation();
  const { commitIdValidation } = useDataStore();

  // Don't show if no orphaned models need removal
  if (!commitIdValidation.orphanedModels?.length > 0) {
    return null;
  }

  return (
    <Alert severity="warning" sx={{ mb: 2 }} data-testid="commit-id-orphaned-models-warning">
      <AlertTitle>
        {t("model_incompatible.header_model_updates_required")}
      </AlertTitle>
      <Typography variant="body2" sx={{ wordBreak: "normal" }}>
        {t("model_incompatible.incompatible_models_message")}
      </Typography>
      <List>
        {commitIdValidation.orphanedModels.map((modelName) => (
          <ListItem key={modelName} sx={{ py: 0 }}>
            <ListItemIcon sx={{ minWidth: 20 }}>
              <Circle sx={{ fontSize: 6 }} />
            </ListItemIcon>
            <ListItemText
              primary={modelName}
              sx={{ "& .MuiTypography-root": { fontSize: "0.875rem" } }}
            />
          </ListItem>
        ))}
      </List>
    </Alert>
  );
};

export default CommitIdNotification;
