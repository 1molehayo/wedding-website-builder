import { Children, cloneElement, isValidElement } from 'react'
import { cn } from '@/lib/utils'

const isValidSlottableElement = (
  value: unknown,
): value is React.ReactElement<{
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
  ref?: React.Ref<unknown>
}> => {
  return (
    isValidElement(value) &&
    !!value.props &&
    typeof value.props === 'object' &&
    'key' in value
  )
}

function composeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (!ref) continue
      if (typeof ref === 'function') {
        ref(node)
      } else {
        ref.current = node
      }
    }
  }
}

export const Slot = ({
  children,
  ref,
  ...props
}: React.ComponentPropsWithRef<React.ElementType>) => {
  const element = Children.only(children)

  if (isValidSlottableElement(element)) {
    const typeDefault =
      element.type === 'button' &&
      (element.props as { type?: unknown }).type === undefined &&
      (props as { type?: unknown }).type === undefined
        ? { type: 'button' as const }
        : {}

    return cloneElement(element, {
      ...props,
      ...element.props,
      ...typeDefault,
      // Keep both the Slot consumer ref and the child's ref (e.g. Floating UI).
      ref: composeRefs(element.props.ref, ref),
      style: {
        ...props.style,
        ...element.props.style,
      },
      className: cn(element.props.className, props.className),
    })
  }

  throw new Error('Slot needs a valid react element child')
}

Slot.displayName = 'Slot'

type SlottableProps = {
  asChild: boolean
  child: React.ReactNode
  children: (child: React.ReactNode) => React.ReactElement
}

export const Slottable = ({ asChild, child, children }: SlottableProps) => {
  return (
    <>
      {asChild
        ? isValidSlottableElement(child)
          ? cloneElement(child, undefined, children(child.props.children))
          : null
        : children(child)}
    </>
  )
}
