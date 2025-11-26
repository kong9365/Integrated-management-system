import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Menu from "@/pages/menu";
import Visitors from "@/pages/visitors";
import EquipmentRate from "@/pages/equipment-rate";
import EquipmentStatus from "@/pages/equipment-status";
import ReservationPage from "@/pages/reservation";
import SensorMonitoring from "@/pages/sensor-monitoring";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/menu" component={Menu} />
      <Route path="/visitors" component={Visitors} />
      <Route path="/equipment-rate" component={EquipmentRate} />
      <Route path="/equipment-status" component={EquipmentStatus} />
      <Route path="/equipment" component={EquipmentStatus} />
      <Route path="/reservation" component={ReservationPage} />
      <Route path="/sensor-monitoring" component={SensorMonitoring} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

