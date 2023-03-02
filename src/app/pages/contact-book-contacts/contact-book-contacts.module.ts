import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { RouterModule, Routes } from '@angular/router'
import { IonicModule } from '@ionic/angular'
import { TranslateModule } from '@ngx-translate/core'
import { ContactBookContactsItemComponent } from './contact-book-contacts-item/contact-book-contacts-item.component'

import { ContactBookContactsPopoverComponent } from './contact-book-contacts-popover/contact-book-contacts-popover.component'
import { ContactBookContactsPage } from './contact-book-contacts.page'

const routes: Routes = [
  {
    path: '',
    component: ContactBookContactsPage
  }
]

@NgModule({
  entryComponents: [ContactBookContactsPopoverComponent, ContactBookContactsItemComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, RouterModule.forChild(routes), TranslateModule],
  declarations: [ContactBookContactsPage, ContactBookContactsPopoverComponent, ContactBookContactsItemComponent]
})
export class ContactBookContactsPageModule {}
