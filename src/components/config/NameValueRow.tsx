import { ConnectionState } from "livekit-client";
import { ReactNode } from "react";

type NameValueRowProps = {
  name: string;
  roomState?: ConnectionState;
  value?: ReactNode;
  valueColor?: string;
};

export const NameValueRow: React.FC<NameValueRowProps> = ({
  name,
  roomState,
  value,
  valueColor = "gray-300",
}) => {
  return (
    <div className="flex flex-row w-full items-baseline text-sm">
      <div className="grow shrink-0 text-gray-500">{name}</div>
      {roomState === ConnectionState.Connected ? (
        <div className="flex pl-4 justify-center items-center gap-2 rounded-xl bg-skin-fill-unselected text-skin-primary">
          {value}
          {roomState && <>{renderConnectedDisconnected(roomState)}</>}
        </div>
      ) : (
        roomState && <>{renderConnectedDisconnected(roomState)}</>
      )}
    </div>
  );
};

const renderConnectedDisconnected = (roomState: ConnectionState) => {
  if (roomState === ConnectionState.Connected) {
    return (
      <div className="flex py-1 px-4 justify-center items-center gap-2 rounded-xl bg-skin-fill-connected text-skin-connected">
        Connected
      </div>
    );
  } else {
    return (
      <div className="flex py-1 px-4 justify-center items-center gap-2 rounded-xl bg-skin-fill-disconnected text-skin-danger">
        Disconnected
      </div>
    );
  }
  
type EditableNameValueRowProps = {
  name: string;
  value: string;
  valueColor?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  editable: boolean;
};

export const EditableNameValueRow: React.FC<EditableNameValueRowProps> = ({
  name,
  value,
  valueColor = "gray-300",
  onValueChange,
  placeholder,
  editable,
}) => {
  if (editable && onValueChange) {
    return (
      <div className="flex flex-row w-full items-baseline text-sm">
        <div className="grow shrink-0 text-gray-500">{name}</div>
        <input
          type="text"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className={`text-xs shrink text-${valueColor} text-right bg-transparent border-b border-gray-800 focus:outline-none focus:border-gray-600 px-2 py-0`}
          placeholder={placeholder}
        />
      </div>
    );
  }
  return <NameValueRow name={name} value={value} valueColor={valueColor} />;
};
