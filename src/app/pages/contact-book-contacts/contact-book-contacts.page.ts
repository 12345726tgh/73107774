import { Component, OnInit } from '@angular/core'
import { PopoverController } from '@ionic/angular'
import { ErrorCategory, handleErrorLocal } from 'src/app/services/error-handler/error-handler.service'
import { NavigationService } from 'src/app/services/navigation/navigation.service'
import { VaultStorageKey, VaultStorageService } from 'src/app/services/storage/storage.service'
import { ContactBookContactsPopoverComponent, SortType } from './contact-book-contacts-popover/contact-book-contacts-popover.component'

enum SortDirection {
  ASCENDING = 'ASCENDING',
  DESCENDING = 'DESCENDING'
}

export enum AddType {
  QR = 'QR',
  MANUAL = 'MANUAL',
  RECOMMENDED = 'RECOMMENDED',
  SIGNING = 'SIGNING'
}

export interface ContactType {
  name: string
  address: string
  date: string
  addedFrom: AddType
}

@Component({
  selector: 'airgap-contact-book-contacts',
  templateUrl: './contact-book-contacts.page.html',
  styleUrls: ['./contact-book-contacts.page.scss']
})
export class ContactBookContactsPage implements OnInit {
  public addEnum: typeof AddType = AddType
  public sortEnum: typeof SortType = SortType

  public sortType: SortType = SortType.NAME
  public sortDirection: SortDirection = SortDirection.DESCENDING

  public contacts: ContactType[] = []

  constructor(
    private readonly popoverCtrl: PopoverController,
    private readonly storageService: VaultStorageService,
    private readonly navigationService: NavigationService
  ) {}

  async ngOnInit() {
    const storedContacts: unknown = await this.storageService.get(VaultStorageKey.AIRGAP_CONTACTS_LIST)
    this.contacts = storedContacts as ContactType[]
  }

  public async onSearch(event: any) {
    const value = event.target.value.toLowerCase()
    const storedContacts: ContactType[] = (await this.storageService.get(VaultStorageKey.AIRGAP_CONTACTS_LIST)) as ContactType[]

    const result = storedContacts.filter(
      (contact) => contact.name.toLowerCase().includes(value) || contact.address.toLowerCase().includes(value)
    )
    this.contacts = result
  }

  public onClickNew(_: any) {
    this.navigationService
      .routeWithState('/contact-book-contacts-detail', { isNew: true }, { replaceUrl: true })
      .catch(handleErrorLocal(ErrorCategory.IONIC_NAVIGATION))
  }

  public onClickItem(contact: ContactType) {
    this.navigationService
      .routeWithState('/contact-book-contacts-detail', { contact: contact })
      .catch(handleErrorLocal(ErrorCategory.IONIC_NAVIGATION))
  }

  public async onClickSort(event: any) {
    console.log('event', event)
    console.log('this.sortType', this.sortType)

    const popover = await this.popoverCtrl.create({
      component: ContactBookContactsPopoverComponent,
      componentProps: {
        defaultSortType: this.sortType,
        onClickSort: (sortType: SortType): void => {
          this.sortType = sortType
          popover.dismiss().catch(handleErrorLocal(ErrorCategory.IONIC_MODAL))
          console.log('this.sortType', this.sortType)
        }
      },
      event,
      translucent: true
    })

    popover.present().catch(handleErrorLocal(ErrorCategory.IONIC_MODAL))
  }

  public getLettersFromNames(): string[] {
    const letters: string[] = []
    for (let i = 0; i < this.contacts.length; i++) {
      const name = this.contacts[i].name
      const letter = name.charAt(0).toUpperCase()
      if (!letters.includes(letter)) letters.push(letter)
    }
    return letters
  }

  public getContactsFromLetter(letter: string): ContactType[] {
    const contacts: ContactType[] = []
    for (let i = 0; i < this.contacts.length; i++) {
      const name = this.contacts[i].name
      const _letter = name.charAt(0).toUpperCase()
      if (_letter === letter) contacts.push(this.contacts[i])
    }
    return contacts
  }

  public getAddressesFromContacts(): string[] {
    const addresses: string[] = []
    for (let i = 0; i < this.contacts.length; i++) {
      if (!addresses.includes(this.contacts[i].address)) addresses.push(this.contacts[i].address)
    }
    return addresses
  }

  public getContactsFromAddress(address: string): ContactType[] {
    const contacts: ContactType[] = []
    for (let i = 0; i < this.contacts.length; i++) {
      if (address === this.contacts[i].address) contacts.push(this.contacts[i])
    }
    return contacts
  }

  public getDatesFromContacts(): string[] {
    const dates: string[] = []
    for (let i = 0; i < this.contacts.length; i++) {
      if (!dates.includes(this.contacts[i].date)) dates.push(this.contacts[i].date)
    }
    return dates
  }

  public getContactsFromDate(date: string): ContactType[] {
    const contacts: ContactType[] = []
    for (let i = 0; i < this.contacts.length; i++) {
      if (date === this.contacts[i].date) contacts.push(this.contacts[i])
    }
    return contacts
  }

  public getAddedTypesFromContacts(): AddType[] {
    const addTypes: AddType[] = []
    for (let i = 0; i < this.contacts.length; i++) {
      if (!addTypes.includes(this.contacts[i].addedFrom)) addTypes.push(this.contacts[i].addedFrom)
    }
    return addTypes
  }

  public getContactsFromAddedType(addedType: AddType): ContactType[] {
    const contacts: ContactType[] = []
    for (let i = 0; i < this.contacts.length; i++) {
      if (addedType === this.contacts[i].addedFrom) contacts.push(this.contacts[i])
    }
    return contacts
  }
}
