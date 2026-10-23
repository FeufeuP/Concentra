'use client';

import React, { useState } from 'react';
import { ClientData } from '@/lib/types';
import { maskPhoneBR } from '@/lib/masks';

interface ClientsViewProps {
  clients: ClientData[];
  onNewQuoteForClient: (client: ClientData) => void;
  onEditClient?: (client: ClientData) => void;
  onDeleteClient?: (clientId: string) => void;
  onAddClient?: (client: ClientData) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  onNewQuoteForClient,
  onEditClient,
  onDeleteClient,
  onAddClient,
}) => {
  const [search, setSearch] = useState('');
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [clientToDelete, setClientToDelete] = useState<ClientData | null>(null);

  const [formData, setFormData] = useState<Partial<ClientData>>({
    name: '',
    cnpj: '',
    riskGrade: 'Grau de Risco 2',
    contactName: '',
    email: '',
    phone: '',
    address: ''
  });

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.cnpj.includes(search) ||
    c.contactName.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      cnpj: '',
      riskGrade: 'Grau de Risco 2',
      contactName: '',
      email: '',
      phone: '',
      address: ''
    });
    setIsAddingClient(true);
  };

  const handleOpenEdit = (client: ClientData) => {
    setEditingClient(client);
    setFormData({ ...client });
    setIsAddingClient(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.cnpj) return;

    if (editingClient) {
      // Alteração de cliente existente
      const updatedClient: ClientData = {
        ...editingClient,
        name: formData.name || '',
        cnpj: formData.cnpj || '',
        riskGrade: formData.riskGrade || 'Grau de Risco 2',
        contactName: formData.contactName || '',
        email: formData.email || '',
        phone: formData.phone || '',
        address: formData.address || ''
      };

      if (onEditClient) {
        onEditClient(updatedClient);
      }
    } else {
      // Inclusão de novo cliente
      const clientToAdd: ClientData = {
        id: `CL-${Math.floor(1000 + Math.random() * 9000)}`,
        name: formData.name || '',
        cnpj: formData.cnpj || '',
        riskGrade: formData.riskGrade || 'Grau de Risco 2',
        contactName: formData.contactName || '',
        email: formData.email || '',
        phone: formData.phone || '',
        address: formData.address || ''
      };
      if (onAddClient) {
        onAddClient(clientToAdd);
      }
    }

    setIsAddingClient(false);
    setEditingClient(null);
    setFormData({ name: '', cnpj: '', riskGrade: 'Grau de Risco 2', contactName: '', email: '', phone: '', address: '' });
  };

  const confirmDelete = (client: ClientData) => {
    setClientToDelete(client);
  };

  const handleConfirmDeleteAction = () => {
    if (!clientToDelete) return;
    const id = clientToDelete.id;
    if (onDeleteClient) {
      onDeleteClient(id);
    }
    setClientToDelete(null);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold text-[#49607e] uppercase tracking-wider block font-mono">
            CADASTRO & RELACIONAMENTO COMERCIAL
          </span>
          <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
            Base de Clientes Corporativos
          </h1>
          <p className="text-xs text-[#49607e] mt-0.5">
            Empresas cadastradas para emissão técnica de programas e laudos SST
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#004328] text-white font-semibold text-xs hover:bg-[#005c3e] transition-colors shadow-xs active:scale-98 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add_business</span>
          <span>+ Cadastrar Novo Cliente</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#e5eeff] shadow-xs">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#49607e] text-[20px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por razão social, CNPJ ou gestor responsável..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#eff4ff] text-xs text-[#0b1c30] placeholder:text-[#707971] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#004328] border border-transparent focus:border-[#c4dcff]"
          />
        </div>
      </div>

      {/* Add / Edit Client Form Modal */}
      {isAddingClient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <form onSubmit={handleSaveForm} className="bg-white rounded-2xl p-6 max-w-lg w-full border border-[#e5eeff] shadow-xl flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#eff4ff]">
              <div>
                <h3 className="font-bold text-base text-[#0b1c30]">
                  {editingClient ? 'Editar Cliente Corporativo' : 'Novo Cliente Corporativo'}
                </h3>
                {editingClient && (
                  <span className="font-mono text-[11px] text-[#004328] font-bold">
                    Código: {editingClient.id}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddingClient(false);
                  setEditingClient(null);
                }}
                className="text-[#49607e] p-1 rounded-lg hover:bg-[#eff4ff]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-[#404942] mb-1">Razão Social *</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Indústria Metalúrgica Delta S.A."
                  className="w-full h-9 px-3 rounded-lg bg-[#eff4ff] border border-[#c4dcff]/40 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#404942] mb-1">CNPJ *</label>
                <input
                  required
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                  className="w-full h-9 px-3 rounded-lg bg-[#eff4ff] border border-[#c4dcff]/40 focus:bg-white focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#404942] mb-1">Grau de Risco</label>
                <select
                  value={formData.riskGrade}
                  onChange={(e) => setFormData({ ...formData, riskGrade: e.target.value })}
                  className="w-full h-9 px-2 rounded-lg bg-[#eff4ff] border border-[#c4dcff]/40 focus:bg-white focus:outline-none"
                >
                  <option value="Grau de Risco 1">Grau de Risco 1</option>
                  <option value="Grau de Risco 2">Grau de Risco 2</option>
                  <option value="Grau de Risco 3">Grau de Risco 3</option>
                  <option value="Grau de Risco 4">Grau de Risco 4</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#404942] mb-1">Contato / Gestor</label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  placeholder="Nome do responsável"
                  className="w-full h-9 px-3 rounded-lg bg-[#eff4ff] border border-[#c4dcff]/40 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#404942] mb-1">Telefone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: maskPhoneBR(e.target.value) })}
                  placeholder="(11) 98765-4321"
                  className="w-full h-9 px-3 rounded-lg bg-[#eff4ff] border border-[#c4dcff]/40 focus:bg-white focus:outline-none font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-[#404942] mb-1">E-mail Comercial</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contato@empresa.com.br"
                  className="w-full h-9 px-3 rounded-lg bg-[#eff4ff] border border-[#c4dcff]/40 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-[#404942] mb-1">Endereço da Planta</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Av. Paulista, 1000 - São Paulo/SP"
                  className="w-full h-9 px-3 rounded-lg bg-[#eff4ff] border border-[#c4dcff]/40 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#eff4ff]">
              <button
                type="button"
                onClick={() => {
                  setIsAddingClient(false);
                  setEditingClient(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-xs font-semibold hover:bg-[#e5eeff]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#004328] text-white text-xs font-semibold hover:bg-[#005c3e]"
              >
                {editingClient ? 'Salvar Alterações' : 'Salvar Cliente'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Modal for Client Deletion */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-[#ffdad6] shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">delete_forever</span>
              </div>
              <div>
                <h3 className="font-bold text-base text-[#0b1c30]">Excluir Cliente Corporativo?</h3>
                <p className="text-xs text-[#49607e]">Esta ação removerá o cadastro da base do sistema.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs flex flex-col gap-1">
              <span className="font-bold text-[#0b1c30]">{clientToDelete.name}</span>
              <span className="font-mono text-[#64748b]">CNPJ: {clientToDelete.cnpj} • Código: {clientToDelete.id}</span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#eff4ff]">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-xs font-semibold hover:bg-[#e5eeff]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAction}
                className="px-4 py-2 rounded-xl bg-[#ba1a1a] text-white text-xs font-semibold hover:bg-[#93000a] flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Clients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className="p-5 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-4 hover:border-[#004328]/40 transition-all group"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#eff4ff] text-[#004328] border border-[#c4dcff]/40">
                    {client.id}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {client.riskGrade}
                  </span>
                </div>

                {/* Ações de Gestão do Cliente: Alterar e Excluir */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(client)}
                    title="Alterar dados do cliente"
                    className="p-1.5 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#004328] transition-colors flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button
                    onClick={() => confirmDelete(client)}
                    title="Excluir cliente da base"
                    className="p-1.5 rounded-lg bg-[#ffdad6]/50 hover:bg-[#ffdad6] text-[#ba1a1a] transition-colors flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-sm text-[#0b1c30] mt-2 line-clamp-1">{client.name}</h3>
              <span className="font-mono text-xs text-[#49607e] block mt-0.5">CNPJ: {client.cnpj}</span>

              <div className="mt-3 pt-3 border-t border-[#eff4ff] text-xs flex flex-col gap-1 text-[#404942]">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-[#49607e]">person</span>
                  <span className="font-medium text-[#0b1c30]">{client.contactName}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#49607e]">
                  <span className="material-symbols-outlined text-[15px]">call</span>
                  <span>{client.phone}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#49607e]">
                  <span className="material-symbols-outlined text-[15px]">mail</span>
                  <span className="truncate">{client.email}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#eff4ff]">
              <button
                onClick={() => onNewQuoteForClient(client)}
                className="w-full py-2 px-3 rounded-xl bg-[#eff4ff] hover:bg-[#004328] hover:text-white text-[#004328] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>Gerar Orçamento SST</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
