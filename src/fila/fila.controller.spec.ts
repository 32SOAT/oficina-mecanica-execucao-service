import { FilaController } from './fila.controller';
import { FilaService } from './fila.service';

describe('FilaController', () => {
  const fila = {
    abrir: jest.fn(),
    concluir: jest.fn(),
    listar: jest.fn(),
  };
  const controller = new FilaController(fila as unknown as FilaService);

  it('delegates the queue actions', async () => {
    await controller.abrir({ osId: 'os-1', etapa: 'DIAGNOSTICO' });
    await controller.concluir('os-1', { etapa: 'REPARO' });
    await controller.listar('os-1');

    expect(fila.abrir).toHaveBeenCalledWith('os-1', 'DIAGNOSTICO');
    expect(fila.concluir).toHaveBeenCalledWith('os-1', 'REPARO');
    expect(fila.listar).toHaveBeenCalledWith('os-1');
  });
});
