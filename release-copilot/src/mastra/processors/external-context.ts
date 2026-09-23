import type { Context } from '@ag-ui/client';
import type {
  ProcessInputArgs,
  ProcessInputResult,
  Processor,
} from '@mastra/core/processors';

class BindingExternalContextProcessor implements Processor {
  id: string;

  constructor() {
    this.id = 'binding-external-context-processor';
  }

  processInput(
    args: ProcessInputArgs<unknown>,
  ): Promise<ProcessInputResult> | ProcessInputResult {
    const aguiContext = args.requestContext?.get('ag-ui');

    if (aguiContext) {
      const externalContext = (aguiContext as Record<'context', Context[]>)
        .context;

      const systemPrompts = externalContext.map(
        ({ description, value }) => `${description}:\n${value}\n`,
      );

      systemPrompts.forEach((content) => {
        args.messageList?.addSystem(
          {
            role: 'system',
            content,
          },
          'copilotkit-context',
        );
      });
    }

    return args.messageList;
  }
}

export const externalContextProcessor = new BindingExternalContextProcessor();
