"use client";

import { ChatMessageType, ChatTile } from "@/components/chat/ChatTile";
import { LoadingSVG } from "@/components/button/LoadingSVG";
import { ColorPicker } from "@/components/colorPicker/ColorPicker";
import { AudioInputTile } from "@/components/config/AudioInputTile";
import { ConfigurationPanelItem } from "@/components/config/ConfigurationPanelItem";
import { NameValueRow } from "@/components/config/NameValueRow";
import { PlaygroundHeader } from "@/components/playground/PlaygroundHeader";
import {
  PlaygroundTab,
  PlaygroundTabbedTile,
  PlaygroundTile,
} from "@/components/playground/PlaygroundTile";
import { useConfig } from "@/hooks/useConfig";
import { TranscriptionTile } from "@/transcriptions/TranscriptionTile";
import {
  BarVisualizer,
  VideoTrack,
  useConnectionState,
  useDataChannel,
  useLocalParticipant,
  useRoomInfo,
  useTracks,
  useVoiceAssistant,
  useRoomContext,
  useParticipantAttributes,
} from "@livekit/components-react";
import { ConnectionState, LocalParticipant, Track } from "livekit-client";
import { QRCodeSVG } from "qrcode.react";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { PlaygroundFooter } from "./PlaygroundFooter";
import { SettingValue } from "@/hooks/useSettings";
import { CameraOffIcon, ChatText, VideoOffIcon } from "./icons";
import DisconnectedPill from "./DisconnectedPill";
import ConnectingPill from "./ConnectingPill";
import tailwindTheme from "../../lib/tailwindTheme.preval";
import { EditableNameValueRow } from "@/components/config/NameValueRow";
import { AttributesInspector } from "@/components/config/AttributesInspector";
import { RpcPanel } from "./RpcPanel";

export interface PlaygroundMeta {
  name: string;
  value: string;
}

export interface PlaygroundProps {
  logo?: ReactNode;
  themeColors: string[];
  onConnect: (connect: boolean, opts?: { token: string; url: string }) => void;
}

const headerHeight = 56;

export default function Playground({
  logo,
  themeColors,
  onConnect,
}: PlaygroundProps) {
  const { config, setUserSettings } = useConfig();
  const { name } = useRoomInfo();
  const [transcripts, setTranscripts] = useState<ChatMessageType[]>([]);
  const { localParticipant } = useLocalParticipant();

  const voiceAssistant = useVoiceAssistant();

  const roomState = useConnectionState();
  const tracks = useTracks();
  const room = useRoomContext();

  const [rpcMethod, setRpcMethod] = useState("");
  const [rpcPayload, setRpcPayload] = useState("");
  const [showRpc, setShowRpc] = useState(false);

  useEffect(() => {
    if (roomState === ConnectionState.Connected) {
      localParticipant.setCameraEnabled(config.settings.inputs.camera);
      localParticipant.setMicrophoneEnabled(config.settings.inputs.mic);
    }
  }, [config, localParticipant, roomState]);

  const agentVideoTrack = tracks.find(
    (trackRef) =>
      trackRef.publication.kind === Track.Kind.Video &&
      trackRef.participant.isAgent
  );

  const localTracks = tracks.filter(
    ({ participant }) => participant instanceof LocalParticipant
  );
  const localCameraTrack = localTracks.find(
    ({ source }) => source === Track.Source.Camera
  );
  const localScreenTrack = localTracks.find(
    ({ source }) => source === Track.Source.ScreenShare
  );
  const localMicTrack = localTracks.find(
    ({ source }) => source === Track.Source.Microphone
  );

  const onDataReceived = useCallback(
    (msg: any) => {
      if (msg.topic === "transcription") {
        const decoded = JSON.parse(
          new TextDecoder("utf-8").decode(msg.payload)
        );
        let timestamp = new Date().getTime();
        if ("timestamp" in decoded && decoded.timestamp > 0) {
          timestamp = decoded.timestamp;
        }
        setTranscripts([
          ...transcripts,
          {
            name: "You",
            message: decoded.text,
            timestamp: timestamp,
            isSelf: true,
          },
        ]);
      }
    },
    [transcripts]
  );

  useDataChannel(onDataReceived);

  const isEnabled = (setting: SettingValue) => {
    if (setting.type === "separator" || setting.type === "theme_color")
      return false;
    if (setting.type === "chat" || setting.type === "room") {
      return config.settings[setting.type];
    }

    if (setting.type === "inputs") {
      const key = setting.key as "camera" | "mic";
      return config.settings.inputs[key];
    } else if (setting.type === "outputs") {
      const key = setting.key as "video" | "audio";
      return config.settings.outputs[key];
    }

    return false;
  };

  const toggleSetting = (setting: SettingValue) => {
    if (setting.type === "separator" || setting.type === "theme_color") return;
    const newValue = !isEnabled(setting);
    const newSettings = { ...config.settings };

    if (setting.type === "chat") {
      newSettings.chat = newValue;
    } else if (setting.type === "inputs") {
      newSettings.inputs[setting.key as "camera" | "mic"] = newValue;
    } else if (setting.type === "outputs") {
      newSettings.outputs[setting.key as "video" | "audio"] = newValue;
    } else if (setting.type === "room") {
      newSettings.room = newValue;
    }
    setUserSettings(newSettings);
  };

  const videoTileContent = useMemo(() => {
    const videoFitClassName = `object-${config.video_fit || "contain"}`;

    const disconnectedContent = (
      <DisconnectedPill
        icon={<VideoOffIcon />}
        prefix="No Video"
        title="to get started."
      />
    );

    const loadingContent = (
      <ConnectingPill icon={<VideoOffIcon />} title="Connecting to video..." />
    );

    const videoContent = (
      <VideoTrack
        trackRef={agentVideoTrack}
        className={`absolute top-1/2 -translate-y-1/2 ${videoFitClassName} object-position-center w-full h-full`}
      />
    );

    let content = null;
    if (roomState === ConnectionState.Disconnected) {
      content = disconnectedContent;
    } else if (agentVideoTrack) {
      content = videoContent;
    } else {
      content = loadingContent;
    }

    return <div className="flex flex-col">{content}</div>;
  }, [agentVideoTrack, config, roomState]);

  useEffect(() => {
    document.body.style.setProperty(
      "--lk-theme-color",
      // @ts-ignore
      tailwindTheme.colors[config.settings.theme_color]["500"]
    );
    document.body.style.setProperty(
      "--lk-drop-shadow",
      `var(--lk-theme-color) 0px 0px 18px`
    );
  }, [config.settings.theme_color]);

  const audioTileContent = useMemo(() => {
    const disconnectedContent = (
      <DisconnectedPill
        icon={<CameraOffIcon />}
        prefix="No audio"
        title="to get started."
      />
    );

    const waitingContent = (
      <ConnectingPill icon={<CameraOffIcon />} title="Connecting to audio..." />
    );

    const visualizerContent = (
      <div
        className={`flex items-center justify-center w-full h-48 [--lk-va-bar-width:30px] [--lk-va-bar-gap:20px] [--lk-fg:var(--lk-theme-color)]`}
      >
        <BarVisualizer
          state={voiceAssistant.state}
          trackRef={voiceAssistant.audioTrack}
          barCount={5}
          options={{ minHeight: 20 }}
        />
      </div>
    );

    if (roomState === ConnectionState.Disconnected) {
      return <div className="flex flex-col">{disconnectedContent}</div>;
    }

    if (!voiceAssistant.audioTrack) {
      return waitingContent;
    }

    return visualizerContent;
  }, [
    voiceAssistant.audioTrack,
    config.settings.theme_color,
    roomState,
    voiceAssistant.state,
  ]);

  const chatTileContent = useMemo(() => {
    const disconnectedContent = (
      <DisconnectedPill
        icon={<ChatText />}
        showSeparator={false}
        title="to start sending messages."
      />
    );
    if (roomState === ConnectionState.Disconnected) {
      return disconnectedContent;
    }

    const waitingContent = (
      <ConnectingPill icon={<ChatText />} title="Connecting to messages..." />
    );

    if (!voiceAssistant.audioTrack) {
      return waitingContent;
    }

    if (voiceAssistant.audioTrack) {
      return (
        <TranscriptionTile
          agentAudioTrack={voiceAssistant.audioTrack}
          accentColor={config.settings.theme_color}
        />
      );
    }

    return <></>;
  }, [
    config.settings.theme_color,
    voiceAssistant.audioTrack,

    voiceAssistant.agent,
    voiceAssistant.audioTrack,
  ]);

  const handleRpcCall = useCallback(async () => {
    if (!voiceAssistant.agent || !room) {
      throw new Error("No agent or room available");
    }

    const response = await room.localParticipant.performRpc({
      destinationIdentity: voiceAssistant.agent.identity,
      method: rpcMethod,
      payload: rpcPayload,
    });
    return response;
  }, [room, rpcMethod, rpcPayload, voiceAssistant.agent]);

  const agentAttributes = useParticipantAttributes({
    participant: voiceAssistant.agent,
  });

  const settingsTileContent = useMemo(() => {
    return (
      <div className="flex flex-col h-full w-full items-start overflow-y-auto">
        {config.description && (
          <ConfigurationPanelItem title="">
            {config.description}
          </ConfigurationPanelItem>
        )}

        <ConfigurationPanelItem title="Room">
          <div className="flex flex-col gap-2">
            <EditableNameValueRow
              name="Room name"
              value={
                roomState === ConnectionState.Connected
                  ? name
                  : config.settings.room_name
              }
              valueColor={`${config.settings.theme_color}-500`}
              onValueChange={(value) => {
                const newSettings = { ...config.settings };
                newSettings.room_name = value;
                setUserSettings(newSettings);
              }}
              placeholder="Auto"
              editable={roomState !== ConnectionState.Connected}
            />
            <NameValueRow
              name="Status"
              value={
                roomState === ConnectionState.Connecting ? (
                  <LoadingSVG diameter={16} strokeWidth={2} />
                ) : (
                  roomState.charAt(0).toUpperCase() + roomState.slice(1)
                )
              }
              valueColor={
                roomState === ConnectionState.Connected
                  ? `${config.settings.theme_color}-500`
                  : "gray-500"
              }
            />
          </div>
        </ConfigurationPanelItem>

        <ConfigurationPanelItem title="Agent">
          <div className="flex flex-col gap-2">
            <EditableNameValueRow
              name="Agent name"
              value={
                roomState === ConnectionState.Connected
                  ? config.settings.agent_name || "None"
                  : config.settings.agent_name || ""
              }
              valueColor={`${config.settings.theme_color}-500`}
              onValueChange={(value) => {
                const newSettings = { ...config.settings };
                newSettings.agent_name = value;
                setUserSettings(newSettings);
              }}
              placeholder="None"
              editable={roomState !== ConnectionState.Connected}
            />
            <NameValueRow
              name="Identity"
              value={
                voiceAssistant.agent ? (
                  voiceAssistant.agent.identity
                ) : roomState === ConnectionState.Connected ? (
                  <LoadingSVG diameter={12} strokeWidth={2} />
                ) : (
                  "No agent connected"
                )
              }
              valueColor={
                voiceAssistant.agent
                  ? `${config.settings.theme_color}-500`
                  : "gray-500"
              }
            />
            {roomState === ConnectionState.Connected &&
              voiceAssistant.agent && (
                <AttributesInspector
                  attributes={Object.entries(
                    agentAttributes.attributes || {}
                  ).map(([key, value], index) => ({
                    id: `agent-attr-${index}`,
                    key,
                    value: String(value),
                  }))}
                  onAttributesChange={() => {}}
                  themeColor={config.settings.theme_color}
                  disabled={true}
                />
              )}
            <p className="text-xs text-gray-500 text-right">
              Set an agent name to use{" "}
              <a
                href="https://docs.livekit.io/agents/worker/dispatch#explicit"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-300 underline"
              >
                explicit dispatch
              </a>
              .
            </p>
          </div>
        </ConfigurationPanelItem>

        <ConfigurationPanelItem title="User">
          <div className="flex flex-col gap-2">
            <EditableNameValueRow
              name="Name"
              value={
                roomState === ConnectionState.Connected
                  ? localParticipant?.name || ""
                  : config.settings.participant_name || ""
              }
              valueColor={`${config.settings.theme_color}-500`}
              onValueChange={(value) => {
                const newSettings = { ...config.settings };
                newSettings.participant_name = value;
                setUserSettings(newSettings);
              }}
              placeholder="Auto"
              editable={roomState !== ConnectionState.Connected}
            />
            <EditableNameValueRow
              name="Identity"
              value={
                roomState === ConnectionState.Connected
                  ? localParticipant?.identity || ""
                  : config.settings.participant_id || ""
              }
              valueColor={`${config.settings.theme_color}-500`}
              onValueChange={(value) => {
                const newSettings = { ...config.settings };
                newSettings.participant_id = value;
                setUserSettings(newSettings);
              }}
              placeholder="Auto"
              editable={roomState !== ConnectionState.Connected}
            />
            <AttributesInspector
              attributes={config.settings.attributes || []}
              onAttributesChange={(newAttributes) => {
                const newSettings = { ...config.settings };
                newSettings.attributes = newAttributes;
                setUserSettings(newSettings);
              }}
              metadata={config.settings.metadata}
              onMetadataChange={(metadata) => {
                const newSettings = { ...config.settings };
                newSettings.metadata = metadata;
                setUserSettings(newSettings);
              }}
              themeColor={config.settings.theme_color}
              disabled={false}
              connectionState={roomState}
            />
          </div>
        </ConfigurationPanelItem>

        {roomState === ConnectionState.Connected &&
          config.settings.inputs.screen && (
            <ConfigurationPanelItem
              title="Screen"
              source={Track.Source.ScreenShare}
            >
              {localScreenTrack ? (
                <div className="relative">
                  <VideoTrack
                    className="rounded-sm border border-gray-800 opacity-70 w-full"
                    trackRef={localScreenTrack}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center text-gray-700 text-center w-full h-full">
                  Press the button above to share your screen.
                </div>
              )}
            </ConfigurationPanelItem>
          )}
        {roomState === ConnectionState.Connected && voiceAssistant.agent && (
          <RpcPanel
            config={config}
            rpcMethod={rpcMethod}
            rpcPayload={rpcPayload}
            setRpcMethod={setRpcMethod}
            setRpcPayload={setRpcPayload}
            handleRpcCall={handleRpcCall}
          />
        )}
        {localCameraTrack && (
          <ConfigurationPanelItem title="Camera" source={Track.Source.Camera}>
            <div className="relative">
              <VideoTrack
                className="rounded-sm border border-gray-800 opacity-70 w-full"
                trackRef={localCameraTrack}
              />
            </div>
          </ConfigurationPanelItem>
        )}
        {localMicTrack && (
          <ConfigurationPanelItem
            title="Microphone"
            source={Track.Source.Microphone}
          >
            <AudioInputTile trackRef={localMicTrack} />
          </ConfigurationPanelItem>
        )}
        <div className="w-full">
          <ConfigurationPanelItem title="Color">
            <ColorPicker
              colors={themeColors}
              selectedColor={config.settings.theme_color}
              onSelect={(color) => {
                const userSettings = { ...config.settings };
                userSettings.theme_color = color;
                setUserSettings(userSettings);
              }}
            />
          </ConfigurationPanelItem>
        </div>
        {config.show_qr && (
          <div className="w-full">
            <ConfigurationPanelItem title="QR Code">
              <QRCodeSVG value={window.location.href} width="128" />
            </ConfigurationPanelItem>
          </div>
        )}
      </div>
    );
  }, [
    config.description,
    config.settings,
    config.show_qr,
    localParticipant,
    name,
    roomState,
    localCameraTrack,
    localScreenTrack,
    localMicTrack,
    themeColors,
    setUserSettings,
    voiceAssistant.agent,
    rpcMethod,
    rpcPayload,
    handleRpcCall,
    showRpc,
    setShowRpc,
  ]);

  let mobileTabs: PlaygroundTab[] = [];
  if (config.settings.outputs.video) {
    mobileTabs.push({
      title: "Video",
      content: (
        <PlaygroundTile
          toggleSetting={toggleSetting}
          className="w-full h-full grow"
          childrenClassName="justify-center"
        >
          {videoTileContent}
        </PlaygroundTile>
      ),
    });
  }

  if (config.settings.outputs.audio) {
    mobileTabs.push({
      title: "Audio",
      content: (
        <PlaygroundTile
          toggleSetting={toggleSetting}
          className="w-full h-full grow"
          childrenClassName="justify-center"
        >
          {audioTileContent}
        </PlaygroundTile>
      ),
    });
  }

  if (config.settings.chat) {
    mobileTabs.push({
      title: "Messages",
      content: (
        <PlaygroundTile
          toggleSetting={toggleSetting}
          className="w-full h-full grow"
          childrenClassName="justify-center"
        >
          {chatTileContent}
        </PlaygroundTile>
      ),
    });
  }

  mobileTabs.push({
    title: "Settings",
    content: (
      <PlaygroundTile
        toggleSetting={toggleSetting}
        padding={false}
        className="h-full w-full basis-1/4 items-start overflow-y-auto flex max-lg:hidden"
        childrenClassName="h-full grow items-start"
      >
        {settingsTileContent}
      </PlaygroundTile>
    ),
  });

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <PlaygroundHeader
        title={config.title}
        logo={logo}
        height={headerHeight}
        accentColor={config.settings.theme_color}
      />
      <div
        className={`flex gap-1 w-full flex-1 min-h-0 selection:bg-${config.settings.theme_color}-900`}
      >
        <div className="flex flex-col grow basis-1/2 gap-4 h-full min-h-0 lg:hidden">
          <PlaygroundTabbedTile
            toggleSetting={toggleSetting}
            className="h-full min-h-0"
            tabs={mobileTabs}
          />
        </div>
        <div
          className={`flex-col grow basis-1/2 gap-4 h-full hidden lg:${
            !config.settings.outputs.audio && !config.settings.outputs.video
              ? "hidden"
              : "flex"
          }`}
        >
          {config.settings.outputs.video && (
            <PlaygroundTile
              toggleSetting={toggleSetting}
              title="Agent Video"
              className="w-full h-full grow"
              childrenClassName="justify-center"
            >
              {videoTileContent}
            </PlaygroundTile>
          )}
          {config.settings.outputs.audio && (
            <PlaygroundTile
              toggleSetting={toggleSetting}
              title="Agent Audio"
              className="w-full h-full grow"
              childrenClassName="justify-center"
            >
              {audioTileContent}
            </PlaygroundTile>
          )}
        </div>

        {config.settings.chat && (
          <PlaygroundTile
            toggleSetting={toggleSetting}
            title="Messages"
            className="h-full grow basis-1/4 hidden lg:flex"
            childrenClassName="justify-center"
            backgroundColor="skin-fill-alternate"
          >
            {chatTileContent}
          </PlaygroundTile>
        )}
        {config.settings.room && (
          <PlaygroundTile
            toggleSetting={toggleSetting}
            title="Room Details"
            padding={false}
            className="h-full w-full basis-1/4 lg:flex overflow-y-auto hidden"
            backgroundColor="skin-fill-alternate"
          >
            {settingsTileContent}
          </PlaygroundTile>
        )}
      </div>
      <PlaygroundFooter
        height={headerHeight}
        accentColor={config.settings.theme_color}
        connectionState={roomState}
        onConnectClicked={() =>
          onConnect(roomState === ConnectionState.Disconnected)
        }
        isEnabled={isEnabled}
        toggleSetting={toggleSetting}
      />
    </div>
  );
}
