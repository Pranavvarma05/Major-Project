import {
  Badge,
  Button,
  FileButton,
  Group,
  Input,
  Tabs,
  Text,
} from "@mantine/core";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { nanoid } from "nanoid";
import { useLocalStorage } from "usehooks-ts";
import {
  ClientSideWSMessageType,
  ServerResponse,
  ServerSideWSMessageType,
  Step1ChecksJobResponse,
  Step2XRFIntensityResponse,
  Step3PredictionPayload,
  Step4X2AbundPayload,
  Step5SRPayload,
} from "../types/ws";
import Visualizations from "./visualizations";
import { MoonLoader } from "react-spinners";
import Results from "./results";
import { getBackendEndpoints } from "../lib/endpoints";
import {
  AbundanceGridRow,
  createLocalJobFromDataset,
  findLocalJob,
  LocalLabJob,
  saveLocalJob,
} from "../lib/mockLab";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const payload = result.includes(",") ? result.split(",")[1] : result;
      resolve(payload);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function Lab() {
  const [clientId, setClientId] = useLocalStorage<string | undefined>(
    "ISRO_CLASS_CLIENT_ID",
    undefined,
  );

  const [file, setFile] = useState<File | null>();
  const [enteredJobId, setEnteredJobId] = useState("");
  const [jobId, setJobId] = useState("");
  const [step1, setStep1] = useState<Step1ChecksJobResponse | undefined>();
  const [step2, setStep2] = useState<Step2XRFIntensityResponse | undefined>();
  const [step3, setStep3] = useState<Step3PredictionPayload | undefined>();
  const [step4, setStep4] = useState<Step4X2AbundPayload | undefined>();
  const [step5, setStep5] = useState<Step5SRPayload | undefined>();
  const [loading, setLoading] = useState<boolean>(false);
  const [transportMessage, setTransportMessage] = useState<string>("");

  const backend = useMemo(
    () =>
      getBackendEndpoints(
        import.meta.env.VITE_APP_BACKEND_URL as string | undefined,
        5000,
      ),
    [],
  );

  const hasBackendConfig = Boolean(backend);

  const resetPipelineState = useCallback(() => {
    setJobId("");
    setStep1(undefined);
    setStep2(undefined);
    setStep3(undefined);
    setStep4(undefined);
    setStep5(undefined);
  }, []);

  const applyLocalJob = useCallback((localJob: LocalLabJob) => {
    setJobId(localJob.jobId);
    setEnteredJobId(localJob.jobId);
    setStep1(localJob.step1);
    setStep2(localJob.step2);
    setStep3(localJob.step3);
    setStep4(localJob.step4);
    setStep5(localJob.step5);
    setLoading(false);
  }, []);

  const handleServerMessages = useCallback(
    (ev: MessageEvent) => {
      const serverResponse: ServerResponse = JSON.parse(ev.data);

      switch (serverResponse.type) {
        case ServerSideWSMessageType.CREATE_JOB: {
          setJobId(serverResponse.jobId);
          setEnteredJobId(serverResponse.jobId);
          setTransportMessage("Upload accepted. Processing in backend pipeline.");
          return;
        }

        case ServerSideWSMessageType.STEP1_CHECK_JOB: {
          if (jobId && serverResponse.jobId != jobId) return;
          setStep1(serverResponse.step1ChecksJobPayload);
          return;
        }

        case ServerSideWSMessageType.STEP2_XRF_INTENSITY_JOB: {
          if (jobId && serverResponse.jobId != jobId) return;
          setStep2(serverResponse.step2XRFIntensityJobPayload);
          return;
        }

        case ServerSideWSMessageType.STEP3_PREDICTION_JOB: {
          if (jobId && serverResponse.jobId != jobId) return;
          setStep3(serverResponse.step3PredictionJobPayload);
          return;
        }

        case ServerSideWSMessageType.STEP4_X2_ABUND_JOB: {
          if (jobId && serverResponse.jobId != jobId) return;
          setStep4(serverResponse.step4X2AbundJobPayload);
          return;
        }

        case ServerSideWSMessageType.STEP5_SR_JOB: {
          if (jobId && serverResponse.jobId != jobId) return;
          setStep5(serverResponse.step5SRJobPayload);
          setLoading(false);
          setTransportMessage("Backend processing complete.");
          return;
        }

        case ServerSideWSMessageType.CHECK_STATUS_JOB: {
          setJobId(serverResponse.jobId);
          setStep1(serverResponse.step1ChecksJobPayload);
          setStep2(serverResponse.step2XRFIntensityJobPayload);
          setStep5(serverResponse.step5SRJobPayload);
          setLoading(false);
          setTransportMessage("Status loaded from backend.");
          return;
        }
      }
    },
    [jobId],
  );

  const { sendJsonMessage, readyState } = useWebSocket(
    backend?.wsUrl ?? null,
    {
      onMessage: handleServerMessages,
      shouldReconnect: () => true,
      reconnectAttempts: 10,
    },
    hasBackendConfig,
  );

  const backendConnected =
    hasBackendConfig && readyState === ReadyState.OPEN;

  useEffect(() => {
    if (!clientId) {
      setClientId(nanoid());
      return;
    }

    if (backendConnected) {
      sendJsonMessage({ clientId });
    }
  }, [backendConnected, clientId, sendJsonMessage, setClientId]);

  const runLocalSimulation = useCallback(
    async (inputFile: File) => {
      const response = await fetch("/data2.json");
      const dataset = (await response.json()) as AbundanceGridRow[];

      const localJob = createLocalJobFromDataset(
        dataset,
        inputFile.name,
        clientId ?? "local-client",
      );

      saveLocalJob(localJob);
      resetPipelineState();
      setTransportMessage(
        "Running in local simulation mode. Results are generated and saved locally.",
      );
      setLoading(true);
      setJobId(localJob.jobId);
      setEnteredJobId(localJob.jobId);

      setTimeout(() => setStep1(localJob.step1), 250);
      setTimeout(() => setStep2(localJob.step2), 650);
      setTimeout(() => setStep3(localJob.step3), 980);
      setTimeout(() => setStep4(localJob.step4), 1250);
      setTimeout(() => {
        setStep5(localJob.step5);
        setLoading(false);
      }, 1650);
    },
    [clientId, resetPipelineState],
  );

  const handleUpload = useCallback(async () => {
    if (!file) {
      setTransportMessage("Pick a FITS file first.");
      return;
    }

    resetPipelineState();
    setLoading(true);

    if (backendConnected) {
      try {
        const fileBase64 = await readFileAsBase64(file);
        sendJsonMessage({
          type: ClientSideWSMessageType.FITS_UPLOAD,
          payload: fileBase64,
        });
        setTransportMessage("File uploaded. Waiting for backend processing.");
        return;
      } catch {
        setTransportMessage(
          "Backend upload failed. Falling back to local simulation.",
        );
      }
    }

    await runLocalSimulation(file);
  }, [backendConnected, file, resetPipelineState, runLocalSimulation, sendJsonMessage]);

  const handleFetchResults = useCallback(() => {
    const requestedJobId = (enteredJobId || jobId).trim();
    if (!requestedJobId) {
      setTransportMessage("Enter a Job ID to load status.");
      return;
    }

    if (backendConnected) {
      sendJsonMessage({
        type: ClientSideWSMessageType.CHECK_STATUS,
        payload: requestedJobId,
      });
      setLoading(true);
      setTransportMessage("Fetching status from backend...");
      return;
    }

    const localJob = findLocalJob(requestedJobId);
    if (!localJob) {
      setTransportMessage(
        "No local record found for this Job ID. Upload a FITS file first.",
      );
      return;
    }

    applyLocalJob(localJob);
    setTransportMessage("Loaded status from local simulation history.");
  }, [applyLocalJob, backendConnected, enteredJobId, jobId, sendJsonMessage]);

  return (
    <div className="lab-root">
      <div className="lab-hero">
        <h1 className="lab-title">Mission Lab Console</h1>
        <p className="lab-subtitle">
          Upload FITS observations, track processing status, and inspect outputs.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Badge color={backendConnected ? "green" : "orange"} variant="filled">
            {backendConnected ? "Backend Connected" : "Local Simulation Mode"}
          </Badge>
          {hasBackendConfig && !backendConnected && (
            <Badge color="yellow" variant="light">
              Backend configured but not reachable
            </Badge>
          )}
        </div>
        {transportMessage && <p className="lab-subtitle mt-2">{transportMessage}</p>}
      </div>

      <Tabs defaultValue="first" className="mt-10 lab-tabs">
        <Tabs.List>
          <Tabs.Tab
            value="second"
            styles={{
              tab: {
                backgroundColor: "black",
              },
            }}
          >
            Upload
          </Tabs.Tab>
          <Tabs.Tab
            value="first"
            color="blue"
            styles={{
              tab: {
                backgroundColor: "black",
              },
            }}
          >
            Get Status
          </Tabs.Tab>
          <Tabs.Tab
            value="third"
            color="blue"
            styles={{
              tab: {
                backgroundColor: "black",
              },
            }}
          >
            Results
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="first" pt="xs">
          <div className="mt-10 flex-col gap-3 rounded-xl" style={{ width: "400px" }}>
            <div className="flex gpa-4">
              <div style={{ width: "300px" }}>
                <Input
                  value={enteredJobId}
                  onChange={(e) => {
                    setEnteredJobId(e.target.value ?? "");
                  }}
                  placeholder="Enter the job ID"
                  width={300}
                />
              </div>
              <Button onClick={handleFetchResults}>CHECK</Button>
            </div>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="second" pt="xs">
          <div className="shadow-xl" style={{ width: "400px" }}>
            <Group justify="center" className="mt-10">
              <FileButton onChange={(selected) => setFile(selected)} accept=".fits">
                {(props) => <Button {...props}>{file ? "Change" : "Pick"} FITS File</Button>}
              </FileButton>
            </Group>

            {file && (
              <div
                className="bg-indigo-600 bg-opacity-50 p-10 rounded-md mt-10"
                style={{ width: "400px" }}
              >
                <Text size="xl" mt="sm">
                  {file.name}
                </Text>

                <Button className="mt-2" onClick={handleUpload}>
                  Process
                </Button>

                {jobId != "" && (
                  <Text size="xl" mt="sm">
                    JobID : {jobId}
                  </Text>
                )}
              </div>
            )}
          </div>
        </Tabs.Panel>
        <Tabs.Panel value="third" pt="xs">
          <Results />
        </Tabs.Panel>
      </Tabs>

      <div className="flex gap-10 w-[100%] items-center justify-center">
        {jobId != "" && (
          <div className="mt-10 w-[80vw] flex flex-col justify-center items-center">
            <Visualizations
              jobID={jobId}
              step1={step1}
              step2={step2}
              step5={step5}
              step3={step3}
              step4={step4}
            />
            {loading && <MoonLoader className="my-5" color="white" />}
          </div>
        )}
      </div>
    </div>
  );
}

export default Lab;
