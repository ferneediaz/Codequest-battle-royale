import * as React from "react"
import { cn } from "../../lib/utils"

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-gray-800 p-1 text-slate-400",
      className
    )}
    ref={ref}
    {...props}
  />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    value: string;
    disabled?: boolean;
  }
>(({ className, value, disabled, ...props }, ref) => (
  <button
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:bg-gray-700 data-[state=active]:text-white data-[state=active]:shadow-sm",
      className
    )}
    ref={ref}
    role="tab"
    data-state={props["aria-selected"] ? "active" : "inactive"}
    disabled={disabled}
    {...props}
  />
))
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string;
  }
>(({ className, value, ...props }, ref) => (
  <div
    role="tabpanel"
    data-state={props["aria-hidden"] ? "inactive" : "active"}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    ref={ref}
    {...props}
  />
))
TabsContent.displayName = "TabsContent"

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
  defaultValue?: string;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, value, onValueChange, children, ...props }, ref) => {
    const handleTabClick = (newValue: string) => {
      onValueChange(newValue);
    };

    // Clone children to add active state and click handlers
    const enhancedChildren = React.Children.map(children, child => {
      if (!React.isValidElement(child)) return child;

      if (child.type === TabsTrigger) {
        return React.cloneElement(child as React.ReactElement<any>, {
          "aria-selected": child.props.value === value,
          onClick: () => handleTabClick(child.props.value)
        });
      }

      if (child.type === TabsContent) {
        return React.cloneElement(child as React.ReactElement<any>, {
          "aria-hidden": child.props.value !== value
        });
      }

      return child;
    });

    return (
      <div
        ref={ref}
        className={cn("data-[state=active]:animate-in data-[state=inactive]:animate-out", className)}
        {...props}
      >
        {enhancedChildren}
      </div>
    );
  }
);
Tabs.displayName = "Tabs";

export { Tabs, TabsList, TabsTrigger, TabsContent }; 