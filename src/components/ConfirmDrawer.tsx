import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

type DrawerProps = Parameters<typeof Drawer>[0]
type ConfirmDrawerProps = DrawerProps & {
  title?: string
  description?: string
  cancelButtonText?: string
  submitButtonText?: string
  trigger: React.ReactNode
  onSubmit: () => void
  children?: React.ReactNode
}
export function ConfirmDrawer({
  title,
  description,
  cancelButtonText = "Cancel",
  submitButtonText = "Confirm",
  trigger,
  onSubmit,
  children,
  ...drawerProps
}: ConfirmDrawerProps) {
  return (
    <Drawer {...drawerProps}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          {title && (
            <DrawerHeader>
              <DrawerTitle>{title}</DrawerTitle>
              {description && <DrawerDescription>{description}</DrawerDescription>}
            </DrawerHeader>
          )}
          {children}
          <DrawerFooter>
            <div className="flex gap-2">
              <DrawerClose asChild>
                <Button className="flex-1" variant="outline" size="lg">
                  {cancelButtonText}
                </Button>
              </DrawerClose>
              <Button className="flex-1" onClick={onSubmit} size="lg">
                {submitButtonText}
              </Button>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
