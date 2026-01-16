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
  submitButtonDisabled?: boolean
  onSubmit: () => void
}

export function ConfirmDrawer({
  cancelButtonText = "Cancel",
  submitButtonText = "Confirm",
  submitButtonVariant,
  submitButtonDisabled = false,
  onSubmit,
  children,
  ...drawerProps
}: ConfirmDrawerProps) {
  return (
    <BaseDrawer {...drawerProps}>
      {children}
      <DrawerFooter>
        <div className="gap-2">
          <Button className="w-full mb-2 max-w-sm" variant={submitButtonVariant} size="lg" onClick={onSubmit} disabled={submitButtonDisabled}>
            {submitButtonText}
          </Button>
          <DrawerClose asChild>
            <Button className="w-full max-w-sm" variant="outline" size="lg">
              {cancelButtonText}
            </Button>
          </DrawerClose>
        </div>
      </DrawerFooter>
    </BaseDrawer>
  )
}
