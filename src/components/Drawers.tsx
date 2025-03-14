import { Button, buttonVariants } from "@/components/ui/button"
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
import { VariantProps } from "class-variance-authority"

type DrawerProps = Parameters<typeof Drawer>[0]
type BaseDrawerProps = DrawerProps & {
  title: string
  description?: string
  trigger?: React.ReactNode
  children?: React.ReactNode
}
export function BaseDrawer({ title, description = "", trigger, children, ...drawerProps }: BaseDrawerProps) {
  return (
    <Drawer {...drawerProps}>
      {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

type ConfirmDrawerProps = BaseDrawerProps & {
  cancelButtonText?: string
  submitButtonText?: string
  submitButtonVariant?: VariantProps<typeof buttonVariants>["variant"]
  onSubmit: () => void
}

export function ConfirmDrawer({
  cancelButtonText = "Cancel",
  submitButtonText = "Confirm",
  submitButtonVariant,
  onSubmit,
  children,
  ...drawerProps
}: ConfirmDrawerProps) {
  return (
    <BaseDrawer {...drawerProps}>
      {children}
      <DrawerFooter>
        <div className="flex gap-2">
          <DrawerClose asChild>
            <Button className="flex-1" variant="outline" size="lg">
              {cancelButtonText}
            </Button>
          </DrawerClose>
          <Button className="flex-1" variant={submitButtonVariant} size="lg" onClick={onSubmit}>
            {submitButtonText}
          </Button>
        </div>
      </DrawerFooter>
    </BaseDrawer>
  )
}
