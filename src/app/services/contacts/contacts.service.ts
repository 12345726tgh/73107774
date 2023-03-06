import { Injectable } from '@angular/core'
import { VaultStorageKey, VaultStorageService } from '../storage/storage.service'

export enum AddType {
  QR = 'QR',
  MANUAL = 'MANUAL',
  RECOMMENDED = 'RECOMMENDED',
  SIGNING = 'SIGNING'
}

export interface ContactInfo {
  id: string
  name: string
  address: string
  date: string
  addedFrom: AddType
}

export interface ContactType {
  id: string
  name: string
  address: string
  date: string
  addedFrom: AddType
  transactions: string[]
}

@Injectable({
  providedIn: 'root'
})
export class ContactsService {
  constructor(private readonly storageService: VaultStorageService) {}

  async getContactsInfo(): Promise<ContactInfo[]> {
    const storedContacts: ContactType[] = (await this.storageService.get(VaultStorageKey.AIRGAP_CONTACTS_LIST)) as ContactType[]
    return storedContacts
  }

  async createContact(name: string, address: string, addedFrom: AddType): Promise<void> {
    const storedContacts: ContactType[] = (await this.storageService.get(VaultStorageKey.AIRGAP_CONTACTS_LIST)) as ContactType[]

    storedContacts.push({
      id: `contact${storedContacts.length + 1}`,
      date: `${new Date().getDate()}. ${new Date().toLocaleString('default', { month: 'short' })}`,
      name,
      address,
      addedFrom,
      transactions: []
    })
    await this.storageService.set(VaultStorageKey.AIRGAP_CONTACTS_LIST, storedContacts)
  }

  async updateContact(id: string, name: string, address: string): Promise<void> {
    const storedContacts: ContactType[] = (await this.storageService.get(VaultStorageKey.AIRGAP_CONTACTS_LIST)) as ContactType[]

    const index = storedContacts.findIndex((contact) => contact.id === id)
    if (index < 0) {
      console.error('No contact with id', id)
      return
    }
    const contact = storedContacts[index]
    contact.name = name
    contact.address = address

    await this.storageService.set(VaultStorageKey.AIRGAP_CONTACTS_LIST, storedContacts)
  }

  async deleteContact(id: string): Promise<void> {
    const storedContacts: ContactType[] = (await this.storageService.get(VaultStorageKey.AIRGAP_CONTACTS_LIST)) as ContactType[]

    const index = storedContacts.findIndex((contact) => contact.id === id)
    if (index < 0) {
      console.error('No contact with id', id)
      return
    }
    storedContacts.splice(index, 1)
    await this.storageService.set(VaultStorageKey.AIRGAP_CONTACTS_LIST, storedContacts)
  }
}
