import { renderToString } from "react-dom/server";
import React from "react";
import AgentStepper from "./src/components/AgentStepper.tsx";

const completedAgents = [{ id: '3', name: 'Agent 3', status: 'completed', description: 'Completed desc' }];
const resultCompleted = renderToString(React.createElement(AgentStepper, { agents: completedAgents as any }));

console.log(resultCompleted);
