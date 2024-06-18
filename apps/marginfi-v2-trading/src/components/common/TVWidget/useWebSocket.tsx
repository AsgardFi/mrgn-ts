import React from "react";
import { useEffect } from "react";

import { Bar, getNextBarTime, parseResolution } from "~/utils/tradingViewUtils";

interface SymbolInfo {
  address: string;
}

interface SubscriptionItem {
  resolution: string;
  lastBar: Bar;
  callback: (bar: Bar) => void;
}

let subscriptionItem: SubscriptionItem = {
  resolution: "",
  lastBar: { time: 0, open: 0, high: 0, low: 0, close: 0, volume: 0 },
  callback: () => {},
};

export const useWebSocket = () => {
  const socketRef = React.useRef<WebSocket | null>(null);

  useEffect(() => {
    // Create WebSocket connection.
    const socket = new WebSocket(
      `wss://public-api.birdeye.so/socket?x-api-key=${process.env.BIRDEYE_API_KEY}`,
      "echo-protocol"
    );
    socketRef.current = socket;

    // Connection opened
    socket.addEventListener("open", (event) => {
      console.log("[socket] Connected");
    });

    // Listen for messages
    socket.addEventListener("message", (msg) => {
      const data = JSON.parse(msg.data);

      if (data.type !== "PRICE_DATA") return console.log(data);

      const currTime = data.data.unixTime * 1000;
      const lastBar = subscriptionItem.lastBar;
      const resolution = subscriptionItem.resolution;
      const nextBarTime = getNextBarTime(lastBar, resolution);

      let bar: Bar;

      if (currTime >= nextBarTime) {
        bar = {
          time: nextBarTime,
          open: data.data.o,
          high: data.data.h,
          low: data.data.l,
          close: data.data.c,
          volume: data.data.v,
        };
        console.log("[socket] Generate new bar");
      } else {
        bar = {
          ...lastBar,
          high: Math.max(lastBar.high, data.data.h),
          low: Math.min(lastBar.low, data.data.l),
          close: data.data.c,
          volume: data.data.v,
        };
        console.log("[socket] Update the latest bar by price");
      }

      subscriptionItem.lastBar = bar;
      subscriptionItem.callback(bar);
    });

    return () => {
      socket.close();
    };
  }, []);

  const subscribeOnStream = (
    symbolInfo: SymbolInfo,
    resolution: string,
    onRealtimeCallback: (bar: Bar) => void,
    lastBar: Bar
  ) => {
    subscriptionItem = {
      resolution,
      lastBar,
      callback: onRealtimeCallback,
    };

    const msg = {
      type: "SUBSCRIBE_PRICE",
      data: {
        chartType: parseResolution(resolution),
        address: symbolInfo.address,
        currency: "usd",
      },
    };

    socketRef.current?.send(JSON.stringify(msg));
  };

  const unsubscribeFromStream = () => {
    const msg = {
      type: "UNSUBSCRIBE_PRICE",
    };

    socketRef.current?.send(JSON.stringify(msg));
  };

  return {
    socket: socketRef.current,
    subscribeOnStream,
    unsubscribeFromStream,
  };
};
