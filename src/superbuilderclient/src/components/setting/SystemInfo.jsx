import React from "react";
import SimpleAccordion from "../accordion/SimpleAccordion";
import { Typography, Card } from "@mui/material";
import MemoryIcon from '@mui/icons-material/Memory';  // for CPU
import SdCardIcon from '@mui/icons-material/SdCard';  // for RAM
import VideogameAssetIcon from '@mui/icons-material/VideogameAsset';  // for GPU/NPU

import useDataStore from "../../stores/DataStore";
import { useTranslation } from 'react-i18next';

export const SystemInfoCard = () => {
    const { t } = useTranslation();
    const sysInfo = useDataStore((state) => state.system_info);
   
    const getSystemValue = (type) => {
        if (sysInfo) {
            switch (type) {
                case "cpu_name":
                    return `${sysInfo.CPUInfo.Name}`;
                case "cpu_core":
                    return `${sysInfo.CPUInfo.NumberOfCores} Cores`;
                case "cpu_lcore":
                    return `${sysInfo.CPUInfo.NumberOfLogicCores} Logic Cores`;
                case "ram":
                    return `${sysInfo.MemoryInfo.CapacityInGB}GB`;
                case "ram_freq":
                    return `${sysInfo.MemoryInfo.FreqInMHz}Mhz`;
                case "npu_name":
                    return `${sysInfo.NpuInfo.Name}`;
                case "npu_version":
                    return `${sysInfo.NpuInfo.version}`;
                case "npu_id":
                    return ''; // hide for now
                default:
                    return '';
            }
        }
    };

    // Helper function to render GPU items
    const renderGpuItems = () => {
        let gpuList = [];
        
        // Add existing GPU data if available
        if (sysInfo && sysInfo.GpuInfo) {
            if (Array.isArray(sysInfo.GpuInfo)) {
                gpuList = [...sysInfo.GpuInfo];
            } else {
                gpuList = [sysInfo.GpuInfo];
            }
        }
        
        if (gpuList.length > 0) {
            return gpuList.map((gpu, index) => (
                <SystemInfoItem
                    key={`gpu-${index}`}
                    icon="gpu"
                    title={`GPU ${index + 1}`}
                    values={[
                        gpu.Name || 'Unknown',
                        gpu.DriverVersion || 'Unknown',
                    ]}
                    data-testid={`system-info-gpu-${index + 1}`}
                />
            ));
        }
        return null;
    };

    return (
        <SimpleAccordion
            title={t('setting.systeminfo.title')}
            description={t('setting.systeminfo.description')}
            data-testid="system-info-accordion"
        >
            <SystemInfoItem
                icon="cpu"
                title="CPU"
                values={[
                    getSystemValue("cpu_name"),
                    getSystemValue("cpu_core"),
                    getSystemValue("cpu_lcore"),
                ]}
                data-testid="system-info-cpu"
            />
            <SystemInfoItem
                icon="memory-card"
                title="RAM"
                values={[
                    getSystemValue("ram"),
                    getSystemValue("ram_freq"),
                ]}
                data-testid="system-info-ram"
            />
            {renderGpuItems()}
            <SystemInfoItem
                icon="gpu"
                title="NPU"
                values={[
                    getSystemValue("npu_name"),
                    getSystemValue("npu_version"),
                    getSystemValue("npu_id"),
                ]}
                data-testid="system-info-npu"
            />
        </SimpleAccordion>
    )

};

const SystemInfoItem = ({
    icon,
    title,
    values,
    'data-testid': dataTestId,
}) => {
    // Helper function to get the correct icon component
    const getIcon = (iconName) => {
        switch (iconName) {
            case 'cpu':
                return <MemoryIcon className="system-icon" />;
            case 'memory-card':
                return <SdCardIcon className="system-icon" />;
            case 'gpu':
                return <VideogameAssetIcon className="system-icon" />;
            default:
                return <MemoryIcon className="system-icon" />;
        }
    };

    return (
        <Card orientation="vertical" className="system-info-card" data-testid={dataTestId} >
            <div className="system-div">
                <div className="system-type">
                    {getIcon(icon)}
                    <Typography>{title}</Typography>
                </div>
                <div className="system-value">
                    {values.map((value, index) => (
                        <React.Fragment key={index}>
                            <Typography variant="body2" className={`${title}-${index}`}>
                                <strong>{value && value.includes("null") ? "" : value}</strong>
                            </Typography>
                            {title === "CPU" && index === 0 && <br />}
                            {title.startsWith("GPU") && index === 1 && <br />}
                            {title === "NPU" && (index === 0 || index === 1) && <br />}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </Card>
    );
};